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

if __name__ == "__main__":
    generate_assets()
