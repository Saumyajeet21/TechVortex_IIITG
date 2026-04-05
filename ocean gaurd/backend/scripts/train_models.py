"""
Train both ML models from scratch using synthetic data.
Run: python scripts/train_models.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.plastic_model import train_and_save as train_plastic
from models.carbon_model import train_and_save as train_carbon

if __name__ == "__main__":
    print("=" * 50)
    print("OceanGuard — Model Training Script")
    print("=" * 50)
    train_plastic()
    print()
    train_carbon()
    print()
    print("✓ Both models trained and saved successfully.")
