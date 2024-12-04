pocet = (input("zadaj pocet znamok: "))
if pocet.isnumeric():
    intPocet = int(pocet)

    vynasZnamkySpolu = 0
    vaha = 0
    for i in range(0, intPocet):        
        znamka = input("aku mas znamku?: ")
        if znamka.isnumeric() and 0 < int(znamka) < 6:

            priemer = input("aka je jej vaha?: ")         
            if 0 < float(priemer) < 100:
                
                vynasZnamkySpolu += int(znamka) * float(priemer)
                vaha += float(priemer)
            else:
                print("E R R O R\n p r o b l e m   s   v a h o u")
                break            
        else:
            print("E R R O R\n p r o b l e m   s   z n a m k o u")
            break
    print("Tvoj priemer je:" , vynasZnamkySpolu/vaha)
else:
    print("E R R O R\n m a s   t u   v p i s a t   c i s l o")