import requests
import json

def list_packs():
    url = "https://ringsdb.com/api/public/packs/"
    response = requests.get(url)
    if response.status_code == 200:
        packs = response.json()
        for pack in packs:
            print(f"Code: {pack['code']}, Name: {pack['name']}")
    else:
        print(f"Error fetching packs: {response.status_code}")

if __name__ == "__main__":
    list_packs()
