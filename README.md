# Milliardo Portfolio

Portfolio interactif et immersif inspiré des terminaux Linux et des interfaces HUD.

## 🚀 Technologies
- **Backend:** Flask (Python)
- **IA:** Groq API (Llama 3.3)
- **Frontend:** HTML5, CSS3, JavaScript

## 🛠️ Installation

1. Cloner le dépôt :
   ```bash
   git clone https://github.com/votre-user/milliardo.git
   cd milliardo
   ```

2. Créer un environnement virtuel :
   ```bash
   python -m venv venv
   source venv/bin/activate  # Linux/macOS
   # ou
   .\venv\Scripts\activate  # Windows
   ```

3. Installer les dépendances :
   ```bash
   pip install -r requirements.txt
   ```

4. Configurer la clé API Groq :
   ```bash
   export GROQ_API_KEY="votre_cle_ici"  # Linux/macOS
   # ou
   $env:GROQ_API_KEY="votre_cle_ici"  # PowerShell
   ```

5. Lancer l'application :
   ```bash
   python app.py
   ```

## 📂 Structure du projet
- `app.py` : Point d'entrée de l'application Flask.
- `projets.json` : Données des projets.
- `static/` : Fichiers statiques (CSS, JS, Images).
- `templates/` : Templates HTML.

## 🛡️ Sécurité
Projet réalisé dans le cadre d'un cursus en Cybersécurité. Focus sur la gestion sécurisée des clés API et la validation des entrées.
