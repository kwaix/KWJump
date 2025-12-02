import os

def generate_assets():
    os.makedirs('public/assets', exist_ok=True)
    
    # Generate Platform SVG (Green with rounded corners and a slight border)
    with open('public/assets/platform.svg', 'w') as f:
        f.write('''<svg width="80" height="20" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="80" height="20" rx="10" ry="10" fill="#4CAF50" stroke="#388E3C" stroke-width="2"/>
  <rect x="5" y="2" width="70" height="8" rx="4" ry="4" fill="#81C784" fill-opacity="0.5"/>
</svg>''')

    # Generate Cloud SVG (Fluffy white shape)
    with open('public/assets/cloud.svg', 'w') as f:
        f.write('''<svg width="100" height="60" xmlns="http://www.w3.org/2000/svg">
  <path d="M25,50 Q10,50 10,35 Q10,20 25,20 Q30,5 50,5 Q70,5 75,20 Q90,20 90,35 Q90,50 75,50 Z" fill="white" fill-opacity="0.8"/>
</svg>''')

    # Generate Blue Balloon SVG
    with open('public/assets/balloon_blue.svg', 'w') as f:
        f.write('''<svg width="30" height="40" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="15" cy="18" rx="12" ry="15" fill="#2196F3" />
  <path d="M15,33 L15,40" stroke="#888" stroke-width="2" />
  <circle cx="10" cy="12" r="3" fill="white" fill-opacity="0.4" />
</svg>''')

    # Generate Red Balloon SVG
    with open('public/assets/balloon_red.svg', 'w') as f:
        f.write('''<svg width="30" height="40" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="15" cy="18" rx="12" ry="15" fill="#F44336" />
  <path d="M15,33 L15,40" stroke="#888" stroke-width="2" />
  <circle cx="10" cy="12" r="3" fill="white" fill-opacity="0.4" />
</svg>''')

    # Generate Character SVG
    with open('public/assets/character.svg', 'w') as f:
        f.write('''<svg width="50" height="50" xmlns="http://www.w3.org/2000/svg">
  <rect x="2" y="2" width="46" height="46" rx="10" ry="10" fill="#9C27B0" stroke="#7B1FA2" stroke-width="2"/>
  <circle cx="15" cy="18" r="5" fill="white" />
  <circle cx="35" cy="18" r="5" fill="white" />
  <circle cx="15" cy="18" r="2" fill="black" />
  <circle cx="35" cy="18" r="2" fill="black" />
  <path d="M15,35 Q25,45 35,35" stroke="white" stroke-width="3" fill="none" stroke-linecap="round" />
</svg>''')

if __name__ == "__main__":
    generate_assets()
