from PIL import Image
import os
import glob

def batch_crop_portraits():
    input_dir = "public/cards"
    output_dir = "public/cardPortraits"
    
    # Coordinates approved by user: (134, 10, 424, 300)
    # This results in a 290x290 square
    crop_box = (134, 10, 424, 300)
    
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
            name_no_ext = os.path.splitext(filename)[0]
            output_filename = f"{name_no_ext}_CardPortrait.png"
            output_path = os.path.join(output_dir, output_filename)
            
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
