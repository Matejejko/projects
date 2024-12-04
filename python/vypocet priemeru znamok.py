pocet = int(input("Zadaj pocet znamok: "))

sucet = 0
for i in range(0, pocet):
    znamka = int(input("Zadaj zanku:"))
    sucet += znamka

print("Priemer znamok je:", sucet/pocet)