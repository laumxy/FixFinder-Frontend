#!/usr/bin/env python3
"""
Python script to embed RV/vehicle problem texts using Sentence-Transformers.
Reads a list of problems from a JSON file, embeds them using a Hugging Face model,
L2-normalizes the vectors, and saves them to a numpy array.
"""

import os
import sys
import json
import time
import argparse
import numpy as np
from tqdm import tqdm
from sentence_transformers import SentenceTransformer


def main():
    # Set up command line argument parsing
    parser = argparse.ArgumentParser(description="Embed vehicle problems using Sentence-Transformers.")
    parser.add_argument(
        "--solutions_file", 
        type=str, 
        default="solutions.json", 
        help="Path to the solutions.json input file"
    )
    parser.add_argument(
        "--model_name", 
        type=str, 
        default="all-MiniLM-L6-v2", 
        help="Hugging Face sentence-transformer model name"
    )
    parser.add_argument(
        "--batch_size", 
        type=int, 
        default=32, 
        help="Batch size for generating embeddings"
    )
    parser.add_argument(
        "--output_embeddings", 
        type=str, 
        default="embeddings.npy", 
        help="Filename for the output numpy embeddings"
    )
    
    args = parser.parse_args()

    # Step 1: Read the solutions.json containing problem statements
    if not os.path.exists(args.solutions_file):
        print(f"Error: Solutions file '{args.solutions_file}' not found.", file=sys.stderr)
        print("Please ensure the file exists at the specified path.", file=sys.stderr)
        sys.exit(1)

    print(f"Reading problems from {args.solutions_file}...")
    try:
        with open(args.solutions_file, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error parsing JSON: {e}", file=sys.stderr)
        sys.exit(1)

    # Validate schema of solutions.json
    problems = []
    for idx, item in enumerate(data):
        if not isinstance(item, dict) or "problem" not in item:
            print(f"Warning: Item at index {idx} is invalid or missing 'problem' key. Skipping.")
            continue
        problems.append(item["problem"])

    if not problems:
        print("Error: No valid problem descriptions found to embed.", file=sys.stderr)
        sys.exit(1)

    print(f"Successfully loaded {len(problems)} problem texts.")

    # Step 2: Query-prefixing logic for E5 model compatibility
    # E5 models require prepending "query: " (or "passage: ") to retrieve or match items properly.
    if "e5" in args.model_name.lower():
        print("E5 model detected. Prepended 'query: ' prefix to each problem text for optimal alignment.")
        processed_texts = [f"query: {text}" for text in problems]
    else:
        processed_texts = problems

    # Step 3: Load the SentenceTransformer model
    # SentenceTransformers automatically selects 'cuda' if GPU is available, falling back to 'cpu'.
    print(f"Loading Hugging Face model '{args.model_name}'...")
    try:
        start_time = time.time()
        model = SentenceTransformer(args.model_name)
        load_time = time.time() - start_time
        print(f"Model loaded successfully in {load_time:.2f} seconds on device: {model.device}")
    except Exception as e:
        print(f"Error loading model '{args.model_name}': {e}", file=sys.stderr)
        sys.exit(1)

    # Step 4: Encode the problems in batches with tqdm progress bar
    print("Beginning text embedding generation...")
    embed_start_time = time.time()
    
    embeddings_list = []
    # Process batch-by-batch using tqdm progress bar
    for i in tqdm(range(0, len(processed_texts), args.batch_size), desc="Encoding batches"):
        batch = processed_texts[i : i + args.batch_size]
        # Generate raw embeddings for the current batch
        batch_embeddings = model.encode(
            batch,
            batch_size=len(batch),
            show_progress_bar=False,
            convert_to_numpy=True
        )
        embeddings_list.append(batch_embeddings)

    # Concatenate all generated batches into a single large numpy array
    embeddings = np.vstack(embeddings_list)
    total_embed_time = time.time() - embed_start_time

    # Step 5: L2-normalize the generated embedding vectors
    # This allows users to calculate cosine similarity via simple dot products (np.dot)
    print("Performing L2 normalization on generated vectors...")
    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    # Guard against division by zero for any rare empty or zero-filled vectors
    norms = np.where(norms == 0, 1.0, norms)
    normalized_embeddings = (embeddings / norms).astype(np.float32)

    # Step 6: Save the resulting embeddings to disk as a numpy array file
    print(f"Saving normalized embeddings array to '{args.output_embeddings}'...")
    try:
        np.save(args.output_embeddings, normalized_embeddings)
        print("Embeddings array saved successfully.")
    except Exception as e:
        print(f"Error saving embeddings to disk: {e}", file=sys.stderr)
        sys.exit(1)

    # Step 7: Print diagnostic summary output
    dimension = normalized_embeddings.shape[1]
    sample_vector = normalized_embeddings[0]

    print("\n" + "=" * 50)
    print("EMBEDDING TASK COMPLETED")
    print("=" * 50)
    print(f"Total problems embedded:   {len(problems)}")
    print(f"Embedding dimension:       {dimension}")
    print(f"Shape of saved array:       {normalized_embeddings.shape}")
    print(f"Total encoding duration:   {total_embed_time:.2f} seconds")
    print(f"Average speed:             {len(problems) / total_embed_time:.2f} items/sec" if total_embed_time > 0 else "N/A")
    print("-" * 50)
    print("Sample vector slice from first item (first 5 elements):")
    print(sample_vector[:5])
    print("=" * 50)


if __name__ == "__main__":
    main()
