# BookLore on k3s — Postmortem & Setup Runbook

**Date of incident:** 2026-04-27
**Author:** mrm (with help)
**Status:** Resolved

---

## TL;DR

BookLore went down because the upstream project was deleted by its sole maintainer in March 2026. A container restart on 2026-04-25 triggered an image pull from a registry path that no longer exists. Library data was untouched (lives on host disk + MariaDB), but the app couldn't start. Fixed by switching the image to the `ghcr.io/the-booklore/booklore` community fork. Total outage: ~2 days (unnoticed until ~April 27).

---

## What broke

### Trigger event
On **2026-04-25 10:21 UTC** the BookLore container terminated (exit code 255 — usually external SIGKILL/SIGTERM, e.g. node reboot, k3s service restart, or OOM). Kubernetes attempted to recreate the pod, which required re-pulling the image. The pull failed and kept failing.

### Root cause
The upstream BookLore project — `github.com/booklore-app/booklore`, Docker Hub `booklore/booklore`, `ghcr.io/booklore-app/booklore` — was **deleted by its sole maintainer ("ACX")** sometime in March 2026, following a public dispute over license changes and a planned paid version. All official images were made inaccessible. The project's website (booklore.org), Discord, and GitHub org all 404'd.

The community responded by appointing a fork (`grimmory-tools/grimmory`) as the successor. Another fork (`the-booklore/booklore`) also exists and is the path of least resistance for an in-place upgrade because it preserves the original schema and env-var names.

### Symptoms
- `kubectl get pods -n booklore` → `ImagePullBackOff`
- `kubectl describe pod` → `pull access denied, repository does not exist`
- Manual `sudo k3s ctr images pull docker.io/booklore/booklore:latest` → `insufficient_scope: authorization failed`
- MariaDB pod stayed `1/1 Running` throughout — only the BookLore app was affected
- App data on host filesystem (`/services/booklore/{books,data,bookdrop}`) and DB contents were untouched

---

## Latent issues uncovered (not the root cause, but worth fixing)

| # | Issue | Why it matters |
|---|-------|----------------|
| 1 | NodePort 30606 not allowed in ufw | After fixing the image, LAN clients would still have been blocked. App was apparently only ever tested from localhost. |
| 2 | `image: booklore/booklore:latest` + `imagePullPolicy: Always` | Guarantees a fresh registry hit on every pod restart. Maximum exposure to upstream availability. |
| 3 | `Pa$$w0rd` in YAML env values | Kubernetes resolves `$$` → `$`, so the actual password seen by the container is `Pa$w0rd`. Caused the root-account dump to fail later because the live root password and the env-var no longer agreed. |
| 4 | PUID/PGID inconsistency | BookLore runs as 0:0, MariaDB as 1001:1001. Hostpath dirs are mixed (some `0:0`, some `1001:1001`). Worked but is fragile. |
| 5 | No liveness/readiness probes | App reported Ready while every DB call was timing out (see logs from April 21). Probes would have surfaced this immediately. |
| 6 | No off-host backup | Two-disk setup means physical disk failure is covered, but chassis-level failure / ransomware / `rm -rf` typo would have lost everything. |
| 7 | hostPath volumes pin pod to single node | Fine on single-node k3s, will break if cluster is ever expanded. Use local-path-provisioner PVCs or longhorn for portability. |

---

## Diagnostic flow (use this order if it happens again)

```bash
# 1. Pod state
kubectl get pods -n booklore

# 2. If anything's not Running, get the events
kubectl describe pod -n booklore <pod-name> | tail -20

# 3. Application logs
kubectl logs -n booklore -l app=booklore --tail=200
kubectl logs -n booklore -l app=mariadb  --tail=200

# 4. For ImagePullBackOff: try the pull manually to see the raw registry response
sudo k3s ctr images pull <image-reference>

# 5. Endpoints — empty means no Ready pods (selector mismatch or readiness fails)
kubectl get endpointslices -n booklore

# 6. Service-level connectivity from inside the cluster (drop --rm, kubectl rejects it without -i)
kubectl run curltest -n booklore --restart=Never --image=curlimages/curl --command -- \
  curl -sS -o /dev/null -w 'HTTP %{http_code}\n' --max-time 10 \
  http://booklore.booklore.svc.cluster.local:6060
kubectl delete pod -n booklore curltest

# 7. NodePort from the host
curl -I http://192.168.0.101:30606

# 8. Firewall (commonly forgotten)
sudo ufw status | grep <nodeport>
```

---

## Fix that was applied

1. **Backed up the database** (~368KB SQL dump from `booklore` user, see backup procedure below).
2. **Switched image** in `BookLore.yaml`:
   ```yaml
   # OLD:
   # image: booklore/booklore:latest
   # imagePullPolicy: Always

   # NEW:
   image: ghcr.io/the-booklore/booklore:v2.2.2
   imagePullPolicy: IfNotPresent
   ```
3. **Applied and restarted:**
   ```bash
   kubectl apply -f BookLore.yaml
   kubectl rollout restart deployment/booklore -n booklore
   kubectl rollout status  deployment/booklore -n booklore --timeout=180s
   ```
4. **Opened the firewall:**
   ```bash
   sudo ufw allow 30606/tcp comment 'BookLore NodePort'
   ```
5. **Verified:** pod `1/1 Running`, `kubectl get endpoints booklore -n booklore` populated, app loaded in browser at `http://192.168.0.101:30606`. Library intact: 50 books, 7 series, 65 authors, reading position preserved.

---

## Changes to apply to your future YAML template

For BookLore specifically and for any single-maintainer self-hosted app generally.

### 1. Image — pin a version, mirror locally

```yaml
spec:
  template:
    spec:
      containers:
        - name: booklore
          image: ghcr.io/the-booklore/booklore:v2.2.2   # NEVER :latest
          imagePullPolicy: IfNotPresent                  # not Always
```

After deploying any new image, mirror it to disk so you survive registry deletion:

```bash
mkdir -p /services/k3s-images
sudo k3s ctr images export \
  /services/k3s-images/booklore-v2.2.2.tar \
  ghcr.io/the-booklore/booklore:v2.2.2

# Re-import (e.g., on a fresh node):
sudo k3s ctr images import /services/k3s-images/booklore-v2.2.2.tar
```

### 2. Probes — stop pretending unhealthy = healthy

```yaml
          ports:
            - containerPort: 6060
          readinessProbe:
            httpGet:
              path: /api/v1/healthcheck
              port: 6060
            initialDelaySeconds: 60
            periodSeconds: 30
          livenessProbe:
            httpGet:
              path: /api/v1/healthcheck
              port: 6060
            initialDelaySeconds: 120
            periodSeconds: 60
            failureThreshold: 5
```

### 3. Passwords — use a Secret, no `$` in YAML literals

Generate the secret:
```bash
kubectl create secret generic booklore-db -n booklore \
  --from-literal=root-password='choose-a-real-password-no-dollar-signs' \
  --from-literal=app-password='another-real-password'
```

Reference in BOTH deployments:
```yaml
env:
  - name: DATABASE_PASSWORD
    valueFrom:
      secretKeyRef:
        name: booklore-db
        key: app-password
```

If you must hardcode, **never** use `$` in YAML env values. Kubernetes will eat one in `$$` → `$`, and unquoted `$(foo)` triggers variable substitution.

### 4. Firewall — open the NodePort the same minute you define it

For every NodePort service, add an immediate ufw rule with a comment:

```bash
sudo ufw allow <nodeport>/tcp comment '<app-name> NodePort'
sudo ufw status numbered | grep <nodeport>   # confirm
```

For BookLore specifically: `30606/tcp`.

### 5. PUID/PGID consistency

Pick one UID/GID for the whole stack and stick to it (1000:1000 is the linuxserver.io default, easy to remember). Then:

```bash
sudo chown -R 1000:1000 /services/booklore
```

Update both deployments:
```yaml
# BookLore
env:
  - name: USER_ID
    value: "1000"
  - name: GROUP_ID
    value: "1000"

# MariaDB
env:
  - name: PUID
    value: "1000"
  - name: PGID
    value: "1000"
```

---

## Backup procedure (verified working)

Run weekly via cron, and manually before any upgrade.

```bash
sudo bash -c '
NS=booklore
POD=$(kubectl get pod -n $NS -l app=mariadb -o jsonpath="{.items[0].metadata.name}")
PW=$(kubectl exec -n $NS $POD -- printenv MYSQL_PASSWORD)
OUT=/root/booklore-backups/$(date +%Y%m%d-%H%M%S)-booklore.sql
mkdir -p /root/booklore-backups
kubectl exec -n $NS $POD -- env MYSQL_PWD="$PW" \
  mariadb-dump -ubooklore --single-transaction --routines --triggers \
  --databases booklore > "$OUT"
ls -lh "$OUT"
tail -1 "$OUT"     # should print "-- Dump completed on <date>"
'
```

Notes:
- Uses the `booklore` user, not `root`. `MYSQL_ROOT_PASSWORD` in the env is out of sync with the actual root password in the DB (legacy from the linuxserver image first-init behavior).
- `--single-transaction` gives a consistent InnoDB snapshot without locking — safe to run while MariaDB is live.
- A "good" dump is multi-KB and ends with `-- Dump completed on …`. A near-empty file or missing trailer = something went wrong.

For a full filesystem snapshot (briefly stops MariaDB):
```bash
kubectl scale deployment/mariadb -n booklore --replicas=0
sleep 10
sudo tar czf /root/booklore-backups/$(date +%F)-files.tar.gz -C /services booklore
kubectl scale deployment/mariadb -n booklore --replicas=1
```

### Off-host copy

The `/root/booklore-backups/` directory lives on `nvme0n1`, while the data lives on `vg0-lv_services` (sda). Disk-level redundancy is fine. But for protection against chassis-level failure, ransomware, theft, or accidental `rm`, copy off-host:

```bash
# from a different machine:
scp mrm@192.168.0.101:/root/booklore-backups/<file>.sql ~/backups/booklore/
```

Even better: rclone to a cloud bucket on a cron schedule.

---

## Restore procedure

```bash
NS=booklore
POD=$(kubectl get pod -n $NS -l app=mariadb -o jsonpath='{.items[0].metadata.name}')
PW=$(kubectl exec -n $NS $POD -- printenv MYSQL_PASSWORD)

# Scale down BookLore so it doesn't fight the restore
kubectl scale deployment/booklore -n $NS --replicas=0

# Restore (use the booklore user, same as the dump)
kubectl exec -i -n $NS "$POD" -- env MYSQL_PWD="$PW" \
  mariadb -ubooklore booklore < /root/booklore-backups/<file>.sql

# Bring BookLore back
kubectl scale deployment/booklore -n $NS --replicas=1
```

---

## Lessons (the real ones)

1. **Single-maintainer projects are a bet on one person continuing to care.** When ACX deleted BookLore overnight, every user with `:latest` from a public registry went down within one container restart. Treat this as the baseline assumption for any one-person open-source app, not the worst case.

2. **`:latest` is a debt instrument.** It works until it doesn't, then bills come due all at once. Pin versions. Update on your schedule, not the maintainer's.

3. **Mirror images locally.** A 100MB tarball on disk is cheaper than rebuilding your library from scratch.

4. **Test backups by restoring them.** This time it worked, but the password drift would have made the script fail if no fallback to the `booklore` user existed. A backup you've never restored is theatre.

5. **Open firewall ports the same minute you define a NodePort.** Don't promise yourself you'll do it later. You will not.

6. **The symptom you noticed ("can't access") was downstream of the actual problem ("pod won't start").** Always run `kubectl get pods` before assuming a network/firewall issue.

---

## Open items (not blocking, but worth doing)

- [ ] Pin to `v2.2.2` (currently still on `:latest` for the new fork)
- [ ] Add liveness/readiness probes to `BookLore.yaml`
- [ ] Move passwords from inline env to a Kubernetes Secret
- [ ] Set up weekly cron for the backup script
- [ ] Set up off-host backup copy (scp/rclone)
- [ ] Mirror current image to `/services/k3s-images/`
- [ ] Decide: stay on `the-booklore` fork, or migrate to Grimmory (`grimmory/grimmory`) which has stronger community endorsement

---

## References

- Original (deleted): `github.com/booklore-app/booklore` — 404
- Current fork in use: `github.com/the-booklore/booklore`
- Community-endorsed successor: `github.com/grimmory-tools/grimmory`
- XDA writeup of the BookLore shutdown: search "Single-maintainer open source is a ticking time bomb, and Booklore just detonated"
