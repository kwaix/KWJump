import random

CANVAS_WIDTH = 480
CANVAS_HEIGHT = 800
PLATFORM_WIDTH = 80
PLATFORM_HEIGHT = 20

GRAVITY = 1000
JUMP_FORCE = -550
MOVE_SPEED = 300

def get_max_jump_height():
    # v^2 = u^2 + 2as => v=0 at peak
    # 0 = JUMP_FORCE^2 + 2 * GRAVITY * s
    # s = - (JUMP_FORCE^2) / (2 * GRAVITY)
    # GRAVITY is positive here (downward), JUMP_FORCE is negative (upward)
    # So s should be negative (upward displacement)
    s = - (JUMP_FORCE ** 2) / (2 * GRAVITY)
    return abs(s)

def get_time_to_peak():
    # v = u + at
    # 0 = JUMP_FORCE + GRAVITY * t
    return abs(JUMP_FORCE / GRAVITY)

def get_max_horizontal_dist():
    t_peak = get_time_to_peak()
    # Total air time is 2 * t_peak (assuming landing at same height)
    # But usually landing higher.
    # Max horizontal reach is roughly MOVE_SPEED * 2 * t_peak
    return MOVE_SPEED * (2 * t_peak)

def generate_next_platform(prevX, prevY):
    minGap = 60
    maxGap = 100
    yGap = minGap + random.random() * (maxGap - minGap)
    newY = prevY - yGap

    maxXDist = 180
    xDist = (random.random() - 0.5) * 2 * maxXDist
    newX = prevX + xDist

    if newX < 0: newX += CANVAS_WIDTH
    if newX > CANVAS_WIDTH: newX -= CANVAS_WIDTH

    if newX < 0: newX = 0
    if newX > CANVAS_WIDTH - PLATFORM_WIDTH: newX = CANVAS_WIDTH - PLATFORM_WIDTH
    
    return newX, newY

def analyze():
    print(f"Max Jump Height: {get_max_jump_height():.2f}")
    print(f"Max Horizontal Reach (flat): {get_max_horizontal_dist():.2f}")

    # Simulate First Platform
    baseX = CANVAS_WIDTH / 2 - PLATFORM_WIDTH / 2
    baseY = CANVAS_HEIGHT - 50
    
    print(f"Base Platform: ({baseX}, {baseY})")

    # The code in generateInitialPlatforms uses:
    # currentY = CANVAS_HEIGHT - 50 (750)
    # currentX = CANVAS_WIDTH / 2 - PLATFORM_WIDTH / 2 (200)
    
    currentX = baseX
    currentY = baseY
    
    print("--- Simulating 10 generated steps ---")
    for i in range(10):
        nextX, nextY = generate_next_platform(currentX, currentY)
        
        y_gap = currentY - nextY
        x_dist = abs(nextX - currentX)
        # Handle wrap around distance roughly
        if x_dist > CANVAS_WIDTH / 2:
            x_dist = CANVAS_WIDTH - x_dist
            
        print(f"#{i+1}: ({nextX:.2f}, {nextY:.2f}) - YGap: {y_gap:.2f}, XDist: {x_dist:.2f}")
        
        # Check Reachability
        # Max height reachable given x_dist?
        # t = x_dist / MOVE_SPEED
        # y_peak = JUMP_FORCE * t + 0.5 * GRAVITY * t^2 (displacement)
        # Wait, simple check: is YGap < MaxJumpHeight?
        if y_gap > get_max_jump_height():
            print("  [!] IMPOSSIBLE VERTICAL GAP")
        
        # Check if X distance is traversable within the time to reach that height?
        # Time to reach height h:
        # h = ut + 0.5gt^2 -> 0.5gt^2 + ut - h = 0
        # t = (-u +/- sqrt(u^2 + 2gh)) / g
        # Actually we need to check if the peak of the parabola passing through (0,0) with velocity (vx, vy) covers the point (dx, dy).
        # We assume optimal play: full speed towards target.
        # So we need to check if a projectile with v=(MOVE_SPEED, JUMP_FORCE) can reach (x_dist, -y_gap) (y is down positive, so target is up negative)
        
        # Simplified:
        # Time to reach peak height = 0.55s. Max height = 151px.
        # If gap is 100px.
        # Can we cover the X distance?
        
        currentX, currentY = nextX, nextY

analyze()
