import xml.etree.ElementTree as ET
from PIL import Image
import os
import glob


def convert_jpg_to_png(input_dir):
    """Converts all .jpg files in the input directory to .png format."""
    jpg_paths = glob.glob(os.path.join(input_dir, "*.jpg"))
    jpg_paths += glob.glob(os.path.join(input_dir, "*.jpeg"))

    if not jpg_paths:
        return

    print(f"Found {len(jpg_paths)} JPG files to convert to PNG...")

    for jpg_path in jpg_paths:
        try:
            filename = os.path.basename(jpg_path)
            name_without_ext = os.path.splitext(filename)[0]
            png_path = os.path.join(input_dir, f"{name_without_ext}.png")

            # Open JPG and save as PNG
            img = Image.open(jpg_path)
            # Convert to RGB if necessary (in case of RGBA or other modes)
            if img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')
            img.save(png_path, 'PNG')

            # Remove original JPG file
            os.remove(jpg_path)
            print(f"  Converted: {filename} -> {name_without_ext}.png")

        except Exception as e:
            print(f"  Error converting {jpg_path}: {e}")


def load_card_metadata_from_octgn():
    """Loads card metadata from OCTGN XML file to identify card types."""
    metadata = {}
    octgn_path = "References/octgn_core_set.xml"

    if not os.path.exists(octgn_path):
        print(f"Warning: OCTGN XML file not found at {octgn_path}")
        return metadata

    try:
        tree = ET.parse(octgn_path)
        root = tree.getroot()

        # Find all card elements
        for card in root.findall('.//card'):
            card_number = None
            card_type = None

            # Extract properties
            for prop in card.findall('property'):
                prop_name = prop.get('name')
                prop_value = prop.get('value')

                if prop_name == 'Card Number':
                    card_number = prop_value
                elif prop_name == 'Type':
                    card_type = prop_value

            if card_number and card_type:
                # Format card code as 5-digit string with leading zeros (e.g., "01074")
                code = f"01{int(card_number):03d}"
                # Normalize type to lowercase for consistency
                metadata[code] = card_type.lower()

        print(f"Loaded metadata for {len(metadata)} cards from OCTGN XML.")

    except Exception as e:
        print(f"Error parsing OCTGN XML: {e}")

    return metadata


def batch_crop_portraits():
    input_dir = "public/cards"
    output_dir = "public/cardPortraits"

    # First, convert any JPG files to PNG
    convert_jpg_to_png(input_dir)

    # Load metadata from OCTGN to distinguish card types
    card_metadata = load_card_metadata_from_octgn()

    # Crop boxes for different card types:
    # Hero/Ally/Enemy: (134, 10, 424, 300) -> 290x290
    # Location: (104, 87, 334, 317) -> 230x230
    HERO_CROP_BOX = (134, 10, 424, 300)
    LOCATION_CROP_BOX = (104, 87, 334, 317)

    # Ensure output directory exists
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"Created directory: {output_dir}")

    # Find all PNG images in the input directory
    image_paths = glob.glob(os.path.join(input_dir, "*.png"))

    print(f"Found {len(image_paths)} PNG images to process.")

    processed_count = 0
    location_count = 0
    other_count = 0

    for input_path in image_paths:
        try:
            filename = os.path.basename(input_path)
            card_code = os.path.splitext(filename)[0]
            output_path = os.path.join(output_dir, f"{card_code}.png")

            # Determine card type from OCTGN data
            card_type = card_metadata.get(card_code, 'unknown')

            if card_type == 'location':
                crop_box = LOCATION_CROP_BOX
                location_count += 1
            else:
                # Default to Hero/Ally box for everything else
                # (hero, ally, event, attachment, enemy, treachery, quest, objective)
                crop_box = HERO_CROP_BOX
                other_count += 1

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

    print(f"\nSuccessfully created {processed_count} portraits in {output_dir}.")
    print(f"  - Locations (special crop): {location_count}")
    print(f"  - Other cards (standard crop): {other_count}")


if __name__ == "__main__":
    batch_crop_portraits()
