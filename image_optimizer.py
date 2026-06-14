import os
from PIL import Image

# Augmentation de la limite de pixels pour les images Upscaylées (70Mo+)
Image.MAX_IMAGE_PIXELS = None

def get_optimized_image(filename, folder='img'):
    """
    Vérifie si une version WebP existe. Sinon, la crée.
    filename peut être un nom simple 'moi.png' ou un chemin 'img/cyber.jpg'
    """
    if not filename:
        return filename

    # Nettoyage du filename : si on reçoit 'img/cyber.jpg', on extrait 'cyber.jpg' 
    # et on s'assure que folder est 'img'
    if '/' in filename:
        parts = filename.split('/')
        if len(parts) >= 2:
            folder = parts[0]
            filename = parts[-1]
    
    # Chemin vers le dossier static
    base_dir = os.path.join('static', folder)
    
    name, ext = os.path.splitext(filename)
    
    # On ignore les formats déjà optimisés ou les icônes
    if ext.lower() in ['.webp', '.svg', '.gif'] or 'icon' in filename.lower():
        return f"{folder}/{filename}" if '/' not in filename else filename

    source_path = os.path.join(base_dir, filename)
    webp_filename = f"{name}.webp"
    webp_path = os.path.join(base_dir, webp_filename)

    # Si le fichier source n'existe pas, on renvoie l'original
    if not os.path.exists(source_path):
        return f"{folder}/{filename}" if '/' not in filename else filename

    # Si la version WebP existe déjà, on renvoie son chemin relatif à static/
    if os.path.exists(webp_path):
        return f"{folder}/{webp_filename}"

    # Création de la version WebP
    try:
        with Image.open(source_path) as img:
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGBA")
            else:
                img = img.convert("RGB")

            if img.width > 1920:
                ratio = 1920 / float(img.width)
                new_height = int(float(img.height) * float(ratio))
                img = img.resize((1920, new_height), Image.Resampling.LANCZOS)
            
            img.save(webp_path, 'webp', quality=80)
            return f"{folder}/{webp_filename}"
    except Exception as e:
        print(f"⚠️ Erreur optimisation {filename}: {e}")
        return f"{folder}/{filename}" if '/' not in filename else filename
