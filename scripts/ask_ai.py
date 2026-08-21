#!/usr/bin/env python3
"""
Script CLI pour interroger le modèle NVIDIA Nemotron Reasoning.
Utilisation:
  python scripts/ask_ai.py "Explique comment optimiser cette fonction..."
  python scripts/ask_ai.py --file components/StockManager.tsx "Analyse ce fichier"
"""

import os
import sys
import json
import argparse
import requests
from dotenv import load_dotenv

# Charger les variables d'environnement depuis .env.local ou .env
load_dotenv('.env.local')
load_dotenv('.env')

API_KEY = os.getenv('NVIDIA_API_KEY')
INVOKE_URL = "https://integrate.api.nvidia.com/v1/chat/completions"

def ask_nemotron(prompt: str, context: str = "", model: str = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning"):
    if not API_KEY:
        print("❌ Erreur: Variable NVIDIA_API_KEY introuvable.")
        print("👉 Veuillez ajouter NVIDIA_API_KEY=nvapi-... dans votre fichier .env.local")
        sys.exit(1)

    full_content = prompt
    if context:
        full_content = f"--- CONTEXTE CODE ---\n{context}\n\n--- QUESTION / INSTRUCTION ---\n{prompt}"

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }

    payload = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": full_content
            }
        ],
        "temperature": 0.6,
        "top_p": 0.95,
        "max_tokens": 65536,
        "reasoning_budget": 16384,
        "stream": False
    }

    print(f"🤖 [NVIDIA Nemotron 30B Reasoning] Analyse en cours...")
    try:
        res = requests.post(INVOKE_URL, headers=headers, json=payload, timeout=120)
        if res.status_code != 200:
            print(f"❌ Erreur API ({res.status_code}): {res.text}")
            return

        data = res.json()
        choice = data.get("choices", [{}])[0]
        message = choice.get("message", {})
        content = message.get("content", "")
        reasoning = message.get("reasoning_content", "")

        if reasoning:
            print("\n🧠 --- RAISONNEMENT DU MODÈLE ---")
            print(reasoning)

        print("\n💡 --- RÉPONSE / CODE GÉNÉRÉ ---")
        print(content)

    except Exception as e:
        print(f"❌ Exception: {e}")

def main():
    parser = argparse.ArgumentParser(description="Assistant de code IA avec NVIDIA Nemotron Reasoning")
    parser.add_argument("prompt", nargs="?", default="", help="Votre question ou instruction de code")
    parser.add_argument("--file", "-f", help="Fichier de code à passer en contexte")
    args = parser.parse_args()

    context = ""
    if args.file and os.path.exists(args.file):
        with open(args.file, "r", encoding="utf-8", errors="ignore") as f:
            context = f.read()

    if not args.prompt and not context:
        print("Usage: python scripts/ask_ai.py \"Votre question de code...\"")
        print("Option fichier: python scripts/ask_ai.py --file components/StockManager.tsx \"Trouve les bugs\"")
        return

    ask_nemotron(args.prompt or "Analyse ce code et propose des améliorations.", context)

if __name__ == "__main__":
    main()
