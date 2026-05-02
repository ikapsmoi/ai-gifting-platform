import json
import re
from collections import defaultdict

def map_tags_to_keywords(input_file, output_file):
    # Load the JSON data
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            products = json.load(f)
    except FileNotFoundError:
        print(f"Error: Could not find {input_file}. Please ensure your JSON data is saved in this file.")
        return

    # Dictionary to track word frequency per tag
    tag_word_freq = defaultdict(lambda: defaultdict(int))

    # Common stop words to ignore so we only get meaningful search words
    stop_words = {
        "with", "for", "and", "the", "logo", "set", "friendly", 
        "custom", "premium", "printing", "gift", "approx", "from", 
        "size", "color", "your", "this", "that"
    }

    print("Analyzing tags and generating leader search words...")

    # Step 1: Analyze tag-to-word associations
    for item in products:
        # Extract words (3 letters or more) from the product name
        name = item.get('name', '').lower()
        words = re.findall(r'\b[a-zA-Z]{3,}\b', name)
        filtered_words = [w for w in words if w not in stop_words]

        for tag in item.get('tags', []):
            for word in filtered_words:
                tag_word_freq[tag][word] += 1

    # Step 2: Determine the top 'leader' search words for each tag
    tag_mapping = {}
    for tag, word_counts in tag_word_freq.items():
        # Get the top 2 most common descriptive words for this tag
        top_words = sorted(word_counts.items(), key=lambda x: x[1], reverse=True)[:2]
        tag_mapping[tag] = [word for word, count in top_words]

    # Step 3: Append the leader search words to each product
    for item in products:
        search_words = set()
        for tag in item.get('tags', []):
            if tag in tag_mapping:
                search_words.update(tag_mapping[tag])
        
        # Assign the unique search words to the product, sorting them alphabetically for clean output
        item['leader_search_words'] = sorted(list(search_words))

    # Step 4: Write the updated data to the output file
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(products, f, indent=4)

    print(f"Success! Processed {len(products)} products.")
    print(f"The updated dataset has been saved to {output_file}.")

if __name__ == "__main__":
    # Save the JSON list you provided into a file named 'input.json' in the same directory as this script.
    input_filename = 'input.json'
    output_filename = 'converted_products.json'
    
    map_tags_to_keywords(input_filename, output_filename)