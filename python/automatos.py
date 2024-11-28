import random

def game():
    print()
    ovocie = ["jablko", "hruska", "marhula", "broskynka", "citron"]
    c1 = random.choice(ovocie)
    c2 = random.choice(ovocie)
    c3 = random.choice(ovocie)
    print(c1, c2, c3, sep="\n")
    print()
    if c1 == c2 == c3:
        print("WOW neprejebal si, gwatuwuje, UwU.")
        return True
    else:
        print("Prejebal si, gg.\n")
        return False


x = input("Dame ovocičko???[a/n]:\n")


if x == "a":
    game()
    while True or False:
        z = input("Dame este jedno ovocičko??? :3[a/n]:\n")
        print()
        if z == "a":
            game()
        else:
            print()
            print("tak neotravuj a zmyzni kkt. :(")
            break
else:
    print()
    print("Nechces ovocie, tak nechces, nebudem ta nutit.\n :(")

