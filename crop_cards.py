import json
from PIL import Image
import os
import glob

def load_card_metadata():
    """Loads card metadata from RingsDB JSON files to identify card types."""
    metadata = {}
    json_paths = [
        "RingsDB/json/Core.json",
        "RingsDB/json/core_encounter.json"
    ]
    
    for path in json_paths:
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                cards = json.load(f)
                for card in cards:
                    metadata[card['code']] = card.get('type_code', 'unknown')
    return metadata

def batch_crop_portraits():
    input_dir = "public/cards"
    output_dir = "public/cardPortraits"
    
    # Load metadata to distinguish hero/ally from locations
    card_metadata = load_card_metadata()
    
    # Boxes approved by user:
    # Hero/Ally: (134, 10, 424, 300) -> 290x290
    # Location: (104, 87, 334, 317) -> 230x230
    HERO_CROP_BOX = (134, 10, 424, 300)
    LOCATION_CROP_BOX = (104, 87, 334, 317)
    
    # Ensure output directory exists
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"Created directory: {output_dir}")
        
    # Find all PNG images in the input directory
    image_paths = glob.glob(os.path.join(input_dir, "*.png"))
    
    print(f"Found {len(image_paths)} images to process.")
    
    processed_count = 0
    for input_path in image_paths:
        try:
            filename = os.path.basename(input_path)
            card_code = os.path.splitext(filename)[0]
            output_path = os.path.join(output_dir, f"{card_code}.png")
            
            # Determine card type and crop box
            card_type = card_metadata.get(card_code, 'unknown')
            
            if card_type == 'location':
                crop_box = LOCATION_CROP_BOX
            else:
                # Default to Hero/Ally box for everything else (hero, ally, event, attachment, enemy)
                # Note: Quest cards might need a third box, but user focused on locations.
                crop_box = HERO_CROP_BOX
            
            img = Image.open(input_path)
            
            # Crop the image
            cropped_img = img.crop(crop_box)
            
            # Save the cropped image
            cropped_img.save(output_path)
            processed_count += 1
            
            if processed_count % 10 == 0:
                print(f"Processed {processed_count}/{len(image_paths)} images...")
                
        except Exception as e:
            print(f"Error processing {input_path}: {e}")

    print(f"Successfully created {processed_count} portraits in {output_dir}.")

if __name__ == "__main__":
    batch_crop_portraits()
