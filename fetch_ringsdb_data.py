import requests
import os
import json
import time

def fetch_all_and_filter(base_dir):
    json_dir = os.path.join(base_dir, 'json')
    images_dir = os.path.join(base_dir, 'images')
    
    # 1. Fetch ALL cards
    print("Fetching ALL cards from RingsDB (this is a large request)...")
    url = "https://ringsdb.com/api/public/cards/"
    response = requests.get(url)
    
    if response.status_code != 200:
        print(f"Error fetching data: {response.status_code}")
        return
    
    all_cards = response.json()
    print(f"Retrieved {len(all_cards)} cards total.")
    
    # 2. Filter for relevant sets
    # The rulebook mentions: Passage Through Mirkwood, Spiders of Mirkwood, Dol Guldur Orcs
    # In RingsDB, these might be in 'encounter_set' or 'pack_name'
    
    relevant_cards = []
    # Identify the core set specifically too
    core_player_cards = [c for c in all_cards if c.get('pack_code') == 'Core']
    relevant_cards.extend(core_player_cards)
    
    # Look for the introductory scenario encounter cards
    # These often have different pack codes like 'M1', 'M2' etc. or are in the Core Set but with encounter flags
    # We'll search by type_code (enemy, location, treachery, quest) and matching strings
    
    keyword_matches = ["Mirkwood", "Guldur", "Anduin"]
    for card in all_cards:
        # Avoid duplicates
        if card in relevant_cards:
            continue
            
        type_code = card.get('type_code')
        name = card.get('name', '')
        text = card.get('text', '')
        
        # We want enemies, locations, treacheries, and quests
        if type_code in ['enemy', 'location', 'treachery', 'quest']:
            if any(k in name or k in text for k in keyword_matches):
                relevant_cards.append(card)

    print(f"Filtered down to {len(relevant_cards)} relevant cards.")
    
    save_path = os.path.join(json_dir, "filtered_cards.json")
    with open(save_path, 'w', encoding='utf-8') as f:
        json.dump(relevant_cards, f, indent=4)
        
    # 3. Download NEW images
    print("Downloading images...")
    for card in relevant_cards:
        image_url = card.get('imagesrc')
        if not image_url:
            code = card.get('code')
            if code:
                image_url = f"https://ringsdb.com/bundles/cards/{code}.png"
            else:
                continue
        
        if image_url.startswith('/'):
            image_url = f"https://ringsdb.com{image_url}"
            
        card_name = card.get('name', 'unknown').replace(' ', '_').replace('"', '').replace(':', '')
        card_code = card.get('code', 'unknown')
        filename = f"{card_code}_{card_name}.png"
        filepath = os.path.join(images_dir, filename)
        
        if os.path.exists(filepath):
            continue
            
        try:
            img_response = requests.get(image_url, stream=True, timeout=10)
            if img_response.status_code == 200:
                with open(filepath, 'wb') as f:
                    for chunk in img_response.iter_content(1024):
                        f.write(chunk)
                print(f"Downloaded: {filename}")
                time.sleep(0.3)
            else:
                print(f"Failed to download image for {card_name} (Code: {card_code})")
        except Exception as e:
            print(f"Error downloading {card_name}: {e}")

if __name__ == "__main__":
    base_dir = r"c:\Users\chunghsien\Desktop\Vibe\LoTR\RingsDB"
    fetch_all_and_filter(base_dir)
