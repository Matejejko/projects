# BookLore → Grimmory Migration & Sovereign Supply Chain

**Date:** 2026-04-27 to 2026-04-28
**Status:** Resolved. Library back online on self-built image.
**Outcome:** Migrated from a deleted upstream project to a community fork, built a complete CI/CD pipeline under personal control, deployed to k3s.

---

## TL;DR — What happened

1. BookLore container died on 2026-04-25 (exit 255), tried to re-pull image, image was gone (upstream nuked the project).
2. Tried community fork `the-booklore/booklore` — worked temporarily but project lineage was suspect (same maintainer who nuked the original).
3. Migrated to community-endorsed fork `grimmory-tools/grimmory` — fully community-run, actively maintained.
4. Built personal CI pipeline: forked Grimmory → GitHub Actions auto-builds new releases → images published to personal GHCR.
5. Deployed `ghcr.io/matejejko/grimmory:3.0.2` to k3s. Library intact: 50 books, 7 series, 65 authors.

---

## Timeline of the failure

### Trigger
- **2026-04-25 10:21 UTC:** BookLore pod terminated (exit 255 — typically external SIGKILL, e.g. node reboot or k3s restart).
- Kubernetes attempted to recreate the pod, which required re-pulling the image.
- Image pull failed with `pull access denied, repository does not exist or may require authorization: insufficient_scope`.

### Root cause
The upstream BookLore project was **deleted by its sole maintainer ("ACX")** in March 2026 following a community dispute over license changes and a planned paid version. Deletions included:
- GitHub: `github.com/booklore-app/booklore` → 404
- Docker Hub: `booklore/booklore` → access denied
- GHCR: `ghcr.io/booklore-app/booklore` → 401 Unauthorized
- Project website (booklore.org), Discord server, GitHub org

Two community responses emerged:
- **`the-booklore/booklore`** — frozen-snapshot fork. Status unclear; possibly maintained by ACX himself under a new name.
- **`grimmory-tools/grimmory`** — community fork run by previous contributors. Multiple maintainers, active development, endorsed by the broader self-hosted community (TrueNAS, Marius/Synology guides, etc.). Now at v3.0.2.

---

## What was preserved (and why)

Despite the upstream project disappearing entirely, no data was at risk because of the architecture in place:

- **Book files** lived on host disk at `/services/booklore/books/` — outside the container, untouched.
- **MariaDB data** lived in the MariaDB container (which was unaffected) and on host disk at `/services/booklore/config/mariadb/databases/`.
- **Reading progress, shelves, users, metadata** lived in the `booklore` MariaDB database — schema-compatible across BookLore → Grimmory.
- The only thing that broke was "BookLore the application binary." Replacing it with Grimmory restored everything because Grimmory reads the same database schema.

---

## Latent issues uncovered along the way

Issues that didn't cause the outage but were lurking:

| # | Issue | Impact |
|---|---|---|
| 1 | NodePort 30606 not allowed in ufw | App was unreachable from LAN even when working — only ever accessed from localhost |
| 2 | `imagePullPolicy: Always` + `:latest` | Maximum exposure to upstream availability — every restart was a fresh registry hit |
| 3 | `Pa$$w0rd` in YAML env values | Kubernetes resolves `$$` → `$`; live container saw `Pa$w0rd`, root account in DB drifted from env var, breaking root-credential operations |
| 4 | PUID/PGID inconsistency | BookLore ran as 0:0, MariaDB as 1001:1001, hostpath dirs mixed — fragile |
| 5 | No liveness/readiness probes | App reported Ready while DB calls were timing out (visible in logs from April 21) |
| 6 | No off-host backup | Two-disk redundancy on server, but chassis-level failure / ransomware / accidental `rm` would lose everything |
| 7 | hostPath volumes | Pin pod to single node; would break if cluster expanded |

---

## Diagnostic flow (use this if it happens again)

```bash
# 1. Pod state — start here always
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

# 6. NodePort from the host
curl -I http://192.168.0.101:30606

# 7. Firewall (commonly forgotten — and was forgotten this time)
sudo ufw status | grep 30606
```

---

## What was actually fixed

### Step 1: Backup (non-negotiable, do before any change)

The `mariadb-dump` of the `booklore` database, taken via the running pod's app credentials (root password had drifted from env var due to `$$` escape):

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
tail -1 "$OUT"
'
```

Result: 368KB SQL dump at `/root/booklore-backups/20260427-180938-booklore.sql`, valid (ended with `Dump completed on …`).

### Step 2: Image migration

Updated `BookLore.yaml`:

```yaml
# OLD
# image: booklore/booklore:latest
# imagePullPolicy: Always

# NEW
image: ghcr.io/matejejko/grimmory:3.0.2
imagePullPolicy: IfNotPresent
```

Applied:

```bash
kubectl apply -f BookLore.yaml
kubectl rollout restart deployment/booklore -n booklore
kubectl rollout status  deployment/booklore -n booklore --timeout=180s
```

### Step 3: Firewall

```bash
sudo ufw allow 30606/tcp comment 'Grimmory NodePort'
```

### Step 4: Verification

```bash
kubectl describe pod -n booklore -l app=booklore | grep -E 'Image:|Image ID:'
# Expected: Image: ghcr.io/matejejko/grimmory:3.0.2

curl -I http://192.168.0.101:30606
# Expected: HTTP/1.1 200
```

Confirmed in browser (incognito to avoid stale cache from the previous Booklore-branded build): Grimmory v3.0.2 with full library intact.

---

## The sovereign supply chain that was built

The whole point of this exercise: **never again let an external project's deletion take down personal infrastructure.**

### The fork

`https://github.com/Matejejko/grimmory` — fork of `grimmory-tools/grimmory`. Default branch switched to `main` (where stable releases live). Source code preserved on personal GitHub account.

### The image registry

`ghcr.io/matejejko/grimmory` — public, automatically populated by CI. Tags include `:3.0.2`, `:3.0`, `:latest`, plus `:sha-<commit>` for every build. Images are immutable once pushed.

### The CI workflows

Two GitHub Actions workflows in `.github/workflows/`:

#### `build.yml` — manual / on-demand builds

Triggers:
- Push to `main` → tags `main`, `latest`, `sha-<short>`
- Push of a `v*` tag → tags `<version>`, `<major>.<minor>`, `sha-<short>`
- Pull requests → builds without pushing (verifies build is clean)
- `workflow_dispatch` → manual runs

Use case: building custom branches, patches, or specific commits.

#### `auto-build-upstream-tags.yml` — daily auto-build of new releases

Triggers:
- Schedule: 06:00 UTC daily
- `workflow_dispatch` for manual runs

Behavior:
1. Fetches all tags from upstream (`grimmory-tools/grimmory`)
2. Pushes any new tags to personal fork (preserves source code)
3. Identifies the latest `v*` tag
4. Checks GHCR for an existing image at that tag
5. If missing, checks out the tag and builds + pushes the image
6. Idempotent — running it again with no new tags is a no-op

Result: when upstream tags v3.0.3, ~6 minutes later the personal GHCR has `:3.0.3` ready to deploy.

### The trust model

| Boundary | Trust gate |
|---|---|
| Upstream → personal fork | Tags only. Tags are deliberate releases, not random commits. |
| Personal fork → personal image | Automatic. Source on personal account → image on personal registry. |
| Personal image → k3s | **Manual.** `kubectl apply` after editing YAML. Two human gates between upstream and prod. |

Bad upstream release reaches the cluster only through:
1. Upstream tags it
2. Personal CI builds it (automatic — but the image just sits on GHCR, not deployed)
3. Personal `kubectl set image` deploys it (requires deliberate action)

### What survives various failure modes

| Failure | Survives? | How |
|---|---|---|
| Upstream Grimmory deleted | ✅ | Source on personal fork, all release tags mirrored, all built images on personal GHCR |
| Personal GitHub account deleted | ✅ if Tier-0 export done (image tarballs on disk) | Otherwise: lose convenience but k3s keeps running on cached images |
| Server disk failure | ✅ | Two-disk setup: data on `vg0-lv_services` (sda), backups on `nvme0n1` |
| Chassis failure / ransomware | ⚠️ | Mitigated only by off-server backup (`scp` to laptop, recommended but not done at time of writing) |
| Personal account hijacked | ✅ for k3s — cached images keep running. New deploys would need credential rotation. |

---

## Configuration changes made to BookLore.yaml

For reference, the relevant sections of the deployment after migration:

```yaml
spec:
  template:
    spec:
      containers:
        - name: booklore
          image: ghcr.io/matejejko/grimmory:3.0.2     # was: booklore/booklore:latest
          imagePullPolicy: IfNotPresent                # was: Always
          env:
            - name: USER_ID
              value: "0"
            - name: GROUP_ID
              value: "0"
            - name: TZ
              value: Europe/Bratislava
            - name: DATABASE_URL
              value: jdbc:mariadb://mariadb.booklore.svc.cluster.local:3306/booklore
            - name: DATABASE_USERNAME
              value: booklore
            - name: DATABASE_PASSWORD
              value: Pa$$w0rd
            - name: BOOKLORE_PORT
              value: "6060"
```

The deployment name (`booklore`), namespace (`booklore`), service name (`booklore`), volume mounts (`/app/data`, `/books`, `/bookdrop`), database name (`booklore`), and database user (`booklore`) were all kept identical to the original BookLore deployment. Per Grimmory's documentation, schema is fully BookLore-compatible — only the image line had to change.

---

## Open items (recommended, not blocking)

- [ ] `scp` the SQL backup off-server to a laptop or cloud bucket
- [ ] Add a weekly cron for the backup script
- [ ] Pin database password in a Kubernetes Secret instead of inline env (also drop the `$$` for `$` issue)
- [ ] Add liveness/readiness probes (`/api/v1/healthcheck`)
- [ ] Standardize PUID/PGID across BookLore and MariaDB (1000 or 1001)
- [ ] Delete the now-redundant `sync-upstream.yml` workflow from the fork
- [ ] Export current image tarball as cold storage: `sudo k3s ctr images export /services/k3s-images/grimmory-3.0.2.tar ghcr.io/matejejko/grimmory:3.0.2`
- [ ] Decide retention policy for old GHCR images (currently keeping all sha-tagged builds forever)

---

## Lessons (the real ones)

1. **Single-maintainer projects are a bet on one person continuing to care.** When ACX deleted BookLore overnight, every user with `:latest` from a public registry went down within one container restart. Treat this as the baseline assumption for any one-person open-source app, not the worst case.

2. **`:latest` from a public registry is a debt instrument.** It works until it doesn't, then bills come due all at once. Pin versions. Update on personal schedule, not the maintainer's.

3. **Mirror images locally.** A 100MB tarball on disk is cheaper than rebuilding a library from scratch.

4. **Test backups by restoring them — or by relying on them.** This time the dump worked, but the password drift would have made the script fail without the fallback to the `booklore` user. A backup never restored is theatre.

5. **Open firewall ports the same minute the NodePort is defined.** "I'll do it later" means "I'll do it during the next outage."

6. **The symptom noticed ("can't access") is often downstream of the actual problem ("pod won't start").** Always run `kubectl get pods` before assuming a network/firewall issue.

7. **Verify-after-do as a reflex.** After every `kubectl apply`, run a `kubectl get`. After every `ufw allow`, run `ufw status`. Caught at least three "I thought I did that" mistakes during this incident.

8. **Browser cache is real.** Spring Boot SPAs cache aggressively. After any UI version change, test in incognito or hard-refresh with cleared site data.

---

## References

- Original (deleted): `github.com/booklore-app/booklore` — 404
- Suspect fork: `github.com/the-booklore/booklore` — possibly ACX-controlled, used briefly
- **Current upstream:** `github.com/grimmory-tools/grimmory`
- **Personal fork:** `github.com/Matejejko/grimmory`
- **Personal image registry:** `ghcr.io/matejejko/grimmory`
- Grimmory documentation: `grimmory.org/docs`
- XDA writeup of the BookLore shutdown: search "Single-maintainer open source is a ticking time bomb, and Booklore just detonated"

---

## Restore procedure (if ever needed)

```bash
NS=booklore
POD=$(kubectl get pod -n $NS -l app=mariadb -o jsonpath='{.items[0].metadata.name}')
PW=$(kubectl exec -n $NS $POD -- printenv MYSQL_PASSWORD)

kubectl scale deployment/booklore -n $NS --replicas=0

kubectl exec -i -n $NS "$POD" -- env MYSQL_PWD="$PW" \
  mariadb -ubooklore booklore < /root/booklore-backups/<file>.sql

kubectl scale deployment/booklore -n $NS --replicas=1
```

## Rollback procedure (if a future Grimmory release breaks something)

```bash
# Roll back to a known-good prior image:
kubectl set image deployment/booklore booklore=ghcr.io/matejejko/grimmory:3.0.1 -n booklore
kubectl rollout status deployment/booklore -n booklore

# Or use Kubernetes' built-in deployment history:
kubectl rollout history deployment/booklore -n booklore
kubectl rollout undo    deployment/booklore -n booklore
```
