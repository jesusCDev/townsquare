<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  
  export let value = '';
  export let placeholder = 'Icon (emoji)';
  export let maxLength = 2;
  
  const dispatch = createEventDispatcher();
  
  let showPicker = false;
  let searchQuery = '';
  let inputEl: HTMLInputElement;
  
  // Curated emoji list with keywords for fuzzy search
  const emojis = [
    // Activities & Sports
    { emoji: '⚽', keywords: ['soccer', 'ball', 'sport', 'football'] },
    { emoji: '🏀', keywords: ['basketball', 'ball', 'sport'] },
    { emoji: '🏈', keywords: ['football', 'ball', 'sport', 'american'] },
    { emoji: '⚾', keywords: ['baseball', 'ball', 'sport'] },
    { emoji: '🎾', keywords: ['tennis', 'ball', 'sport'] },
    { emoji: '🏐', keywords: ['volleyball', 'ball', 'sport'] },
    { emoji: '🏓', keywords: ['ping pong', 'table tennis', 'sport'] },
    { emoji: '🏸', keywords: ['badminton', 'sport'] },
    { emoji: '🏒', keywords: ['hockey', 'sport', 'ice'] },
    { emoji: '🏑', keywords: ['field hockey', 'sport'] },
    { emoji: '🥍', keywords: ['lacrosse', 'sport'] },
    { emoji: '🏏', keywords: ['cricket', 'sport'] },
    { emoji: '🏋️', keywords: ['weightlifting', 'gym', 'workout', 'exercise', 'fitness', 'weights'] },
    { emoji: '🤸', keywords: ['gymnastics', 'exercise', 'workout', 'flexibility'] },
    { emoji: '🧘', keywords: ['yoga', 'meditation', 'exercise', 'zen', 'mindfulness'] },
    { emoji: '🚴', keywords: ['cycling', 'bike', 'exercise', 'sport'] },
    { emoji: '🏃', keywords: ['running', 'run', 'jog', 'exercise', 'cardio'] },
    { emoji: '🏊', keywords: ['swimming', 'swim', 'pool', 'exercise'] },
    { emoji: '🧗', keywords: ['climbing', 'rock climbing', 'sport'] },
    { emoji: '🤺', keywords: ['fencing', 'sport'] },
    { emoji: '🏄', keywords: ['surfing', 'surf', 'sport', 'wave'] },
    { emoji: '⛷️', keywords: ['skiing', 'ski', 'snow', 'sport'] },
    { emoji: '🏂', keywords: ['snowboarding', 'snow', 'sport'] },
    { emoji: '🤽', keywords: ['water polo', 'sport'] },
    
    // Health & Wellness
    { emoji: '💊', keywords: ['pill', 'medicine', 'medication', 'health', 'doctor', 'pharmacy'] },
    { emoji: '💉', keywords: ['syringe', 'injection', 'vaccine', 'medical', 'health'] },
    { emoji: '🩺', keywords: ['stethoscope', 'doctor', 'medical', 'health'] },
    { emoji: '🧬', keywords: ['dna', 'science', 'health', 'biology'] },
    { emoji: '🩹', keywords: ['bandage', 'injury', 'health', 'medical'] },
    { emoji: '🧪', keywords: ['test tube', 'science', 'lab', 'chemistry'] },
    { emoji: '🌡️', keywords: ['thermometer', 'temperature', 'health', 'sick'] },
    { emoji: '❤️', keywords: ['heart', 'love', 'health', 'cardio'] },
    { emoji: '🫀', keywords: ['anatomical heart', 'health', 'organ'] },
    { emoji: '🧠', keywords: ['brain', 'mind', 'mental', 'thinking', 'intelligence'] },
    { emoji: '🦷', keywords: ['tooth', 'dental', 'health', 'hygiene'] },
    { emoji: '🦴', keywords: ['bone', 'skeleton', 'health'] },
    
    // Food & Nutrition
    { emoji: '🥗', keywords: ['salad', 'healthy', 'food', 'vegetables', 'diet'] },
    { emoji: '🍎', keywords: ['apple', 'fruit', 'healthy', 'food'] },
    { emoji: '🍊', keywords: ['orange', 'fruit', 'citrus', 'food'] },
    { emoji: '🍌', keywords: ['banana', 'fruit', 'food'] },
    { emoji: '🥑', keywords: ['avocado', 'healthy', 'food', 'vegetables'] },
    { emoji: '🥦', keywords: ['broccoli', 'vegetable', 'healthy', 'food'] },
    { emoji: '🥕', keywords: ['carrot', 'vegetable', 'healthy', 'food'] },
    { emoji: '🍞', keywords: ['bread', 'food', 'carbs'] },
    { emoji: '🥛', keywords: ['milk', 'dairy', 'drink', 'protein'] },
    { emoji: '🍳', keywords: ['egg', 'cooking', 'food', 'breakfast', 'protein'] },
    { emoji: '🥩', keywords: ['meat', 'steak', 'protein', 'food'] },
    { emoji: '🍗', keywords: ['chicken', 'poultry', 'protein', 'food'] },
    { emoji: '🐟', keywords: ['fish', 'seafood', 'protein', 'food'] },
    { emoji: '🍕', keywords: ['pizza', 'food', 'junk'] },
    { emoji: '🍔', keywords: ['burger', 'food', 'fast food', 'junk'] },
    { emoji: '🍟', keywords: ['fries', 'food', 'fast food', 'junk'] },
    { emoji: '🍝', keywords: ['pasta', 'food', 'italian', 'carbs'] },
    { emoji: '🍜', keywords: ['ramen', 'noodles', 'food', 'asian'] },
    { emoji: '🍱', keywords: ['bento', 'food', 'japanese', 'lunch'] },
    { emoji: '🥤', keywords: ['drink', 'soda', 'beverage'] },
    { emoji: '☕', keywords: ['coffee', 'drink', 'caffeine', 'morning'] },
    { emoji: '🍵', keywords: ['tea', 'drink', 'green tea'] },
    { emoji: '🧃', keywords: ['juice box', 'drink', 'beverage'] },
    { emoji: '🥤', keywords: ['cup with straw', 'drink', 'beverage', 'soda'] },
    { emoji: '🧊', keywords: ['ice', 'cold', 'water'] },
    { emoji: '💧', keywords: ['water', 'droplet', 'hydration', 'drink'] },
    
    // Education & Work
    { emoji: '📚', keywords: ['books', 'reading', 'study', 'education', 'learning'] },
    { emoji: '📖', keywords: ['book', 'reading', 'study', 'education'] },
    { emoji: '✏️', keywords: ['pencil', 'writing', 'study', 'work'] },
    { emoji: '📝', keywords: ['memo', 'writing', 'notes', 'work'] },
    { emoji: '💼', keywords: ['briefcase', 'work', 'business', 'job'] },
    { emoji: '💻', keywords: ['laptop', 'computer', 'work', 'coding', 'programming'] },
    { emoji: '⌨️', keywords: ['keyboard', 'typing', 'computer', 'work'] },
    { emoji: '🖥️', keywords: ['desktop', 'computer', 'work', 'monitor'] },
    { emoji: '🖱️', keywords: ['mouse', 'computer', 'work'] },
    { emoji: '📱', keywords: ['phone', 'mobile', 'smartphone', 'device'] },
    { emoji: '🎓', keywords: ['graduation', 'education', 'school', 'learning'] },
    { emoji: '🏫', keywords: ['school', 'education', 'learning'] },
    { emoji: '🎒', keywords: ['backpack', 'school', 'bag'] },
    { emoji: '📐', keywords: ['ruler', 'math', 'geometry', 'school'] },
    { emoji: '🔬', keywords: ['microscope', 'science', 'lab', 'research'] },
    { emoji: '🧮', keywords: ['abacus', 'math', 'calculation'] },
    { emoji: '📊', keywords: ['chart', 'graph', 'statistics', 'data', 'work'] },
    { emoji: '📈', keywords: ['trending up', 'growth', 'chart', 'success'] },
    { emoji: '📉', keywords: ['trending down', 'chart', 'decline'] },
    
    // Home & Chores
    { emoji: '🧹', keywords: ['broom', 'cleaning', 'chores', 'sweep'] },
    { emoji: '🧺', keywords: ['basket', 'laundry', 'chores'] },
    { emoji: '🧽', keywords: ['sponge', 'cleaning', 'dishes', 'chores'] },
    { emoji: '🧼', keywords: ['soap', 'cleaning', 'hygiene', 'wash'] },
    { emoji: '🚿', keywords: ['shower', 'bath', 'hygiene', 'cleaning'] },
    { emoji: '🛁', keywords: ['bathtub', 'bath', 'hygiene', 'relax'] },
    { emoji: '🪥', keywords: ['toothbrush', 'dental', 'hygiene', 'brush teeth'] },
    { emoji: '🧴', keywords: ['lotion', 'bottle', 'hygiene', 'skincare'] },
    { emoji: '🧻', keywords: ['toilet paper', 'bathroom', 'hygiene'] },
    { emoji: '🗑️', keywords: ['trash', 'garbage', 'waste', 'chores'] },
    { emoji: '🔧', keywords: ['wrench', 'tool', 'repair', 'fix'] },
    { emoji: '🔨', keywords: ['hammer', 'tool', 'repair', 'build'] },
    { emoji: '🪛', keywords: ['screwdriver', 'tool', 'repair', 'fix'] },
    { emoji: '🪚', keywords: ['saw', 'tool', 'cut', 'build'] },
    { emoji: '🏠', keywords: ['house', 'home', 'building'] },
    { emoji: '🛏️', keywords: ['bed', 'sleep', 'bedroom', 'rest'] },
    { emoji: '🪑', keywords: ['chair', 'furniture', 'sit'] },
    { emoji: '🚪', keywords: ['door', 'entrance', 'exit'] },
    
    // Transportation
    { emoji: '🚗', keywords: ['car', 'vehicle', 'drive', 'automobile', 'transport'] },
    { emoji: '🚕', keywords: ['taxi', 'cab', 'vehicle', 'transport'] },
    { emoji: '🚙', keywords: ['suv', 'car', 'vehicle', 'transport'] },
    { emoji: '🚌', keywords: ['bus', 'vehicle', 'transport', 'public'] },
    { emoji: '🚎', keywords: ['trolleybus', 'bus', 'vehicle', 'transport'] },
    { emoji: '🚐', keywords: ['minibus', 'van', 'vehicle', 'transport'] },
    { emoji: '🚛', keywords: ['truck', 'vehicle', 'delivery', 'transport'] },
    { emoji: '🚚', keywords: ['delivery truck', 'vehicle', 'transport'] },
    { emoji: '🚲', keywords: ['bicycle', 'bike', 'cycling', 'transport'] },
    { emoji: '🛴', keywords: ['scooter', 'kick scooter', 'transport'] },
    { emoji: '🛵', keywords: ['motor scooter', 'moped', 'transport'] },
    { emoji: '🏍️', keywords: ['motorcycle', 'bike', 'transport'] },
    { emoji: '✈️', keywords: ['airplane', 'plane', 'flight', 'travel'] },
    { emoji: '🚁', keywords: ['helicopter', 'aircraft', 'flight'] },
    { emoji: '🚂', keywords: ['train', 'railway', 'transport'] },
    { emoji: '🚇', keywords: ['metro', 'subway', 'underground', 'transport'] },
    { emoji: '🚆', keywords: ['train', 'railway', 'transport'] },
    { emoji: '⛴️', keywords: ['ferry', 'boat', 'ship', 'transport'] },
    { emoji: '🚢', keywords: ['ship', 'boat', 'cruise', 'transport'] },
    
    // Nature & Weather
    { emoji: '🌞', keywords: ['sun', 'sunny', 'weather', 'day', 'bright'] },
    { emoji: '🌙', keywords: ['moon', 'night', 'crescent', 'dark'] },
    { emoji: '⭐', keywords: ['star', 'night', 'space'] },
    { emoji: '☁️', keywords: ['cloud', 'weather', 'cloudy'] },
    { emoji: '⛅', keywords: ['partly cloudy', 'weather', 'sun', 'cloud'] },
    { emoji: '🌧️', keywords: ['rain', 'rainy', 'weather', 'water'] },
    { emoji: '⛈️', keywords: ['storm', 'thunder', 'lightning', 'weather'] },
    { emoji: '🌩️', keywords: ['lightning', 'thunder', 'storm', 'weather'] },
    { emoji: '❄️', keywords: ['snow', 'snowflake', 'cold', 'winter', 'weather'] },
    { emoji: '🌨️', keywords: ['snowing', 'snow', 'weather'] },
    { emoji: '☃️', keywords: ['snowman', 'snow', 'winter', 'cold'] },
    { emoji: '🌬️', keywords: ['wind', 'weather', 'blow'] },
    { emoji: '🌪️', keywords: ['tornado', 'cyclone', 'weather', 'wind'] },
    { emoji: '🌊', keywords: ['wave', 'water', 'ocean', 'sea'] },
    { emoji: '🌳', keywords: ['tree', 'nature', 'plant', 'deciduous'] },
    { emoji: '🌲', keywords: ['evergreen', 'tree', 'nature', 'pine'] },
    { emoji: '🌴', keywords: ['palm tree', 'tropical', 'nature'] },
    { emoji: '🌵', keywords: ['cactus', 'desert', 'plant', 'nature'] },
    { emoji: '🌱', keywords: ['seedling', 'plant', 'grow', 'nature'] },
    { emoji: '🌿', keywords: ['herb', 'plant', 'nature', 'leaf'] },
    { emoji: '🍀', keywords: ['four leaf clover', 'luck', 'plant'] },
    { emoji: '🌸', keywords: ['flower', 'blossom', 'cherry', 'nature'] },
    { emoji: '🌺', keywords: ['hibiscus', 'flower', 'tropical', 'nature'] },
    { emoji: '🌻', keywords: ['sunflower', 'flower', 'nature'] },
    { emoji: '🌹', keywords: ['rose', 'flower', 'romantic', 'nature'] },
    { emoji: '🌷', keywords: ['tulip', 'flower', 'nature'] },
    
    // Time & Productivity
    { emoji: '⏰', keywords: ['alarm', 'clock', 'time', 'wake up'] },
    { emoji: '⏱️', keywords: ['stopwatch', 'timer', 'time'] },
    { emoji: '⏲️', keywords: ['timer', 'clock', 'time'] },
    { emoji: '🕐', keywords: ['clock', 'time', '1 oclock'] },
    { emoji: '📅', keywords: ['calendar', 'date', 'schedule', 'planning'] },
    { emoji: '📆', keywords: ['calendar', 'tear-off', 'date', 'schedule'] },
    { emoji: '🗓️', keywords: ['spiral calendar', 'date', 'schedule'] },
    { emoji: '✅', keywords: ['check', 'done', 'complete', 'finished', 'success'] },
    { emoji: '☑️', keywords: ['check box', 'done', 'complete', 'task'] },
    { emoji: '❌', keywords: ['x', 'cross', 'cancel', 'no', 'delete'] },
    { emoji: '🎯', keywords: ['target', 'goal', 'aim', 'bullseye'] },
    { emoji: '🏆', keywords: ['trophy', 'win', 'award', 'success', 'achievement'] },
    { emoji: '🥇', keywords: ['gold medal', 'first', 'winner', 'champion'] },
    { emoji: '🥈', keywords: ['silver medal', 'second', 'place'] },
    { emoji: '🥉', keywords: ['bronze medal', 'third', 'place'] },
    { emoji: '🎖️', keywords: ['military medal', 'award', 'achievement'] },
    { emoji: '🏅', keywords: ['medal', 'sports', 'award', 'achievement'] },
    
    // Emotions & Symbols
    { emoji: '😊', keywords: ['smile', 'happy', 'joy', 'pleased'] },
    { emoji: '😃', keywords: ['grin', 'happy', 'joy'] },
    { emoji: '😄', keywords: ['smile', 'happy', 'laugh'] },
    { emoji: '😁', keywords: ['grin', 'happy', 'smile'] },
    { emoji: '😅', keywords: ['sweat', 'nervous', 'relief'] },
    { emoji: '😂', keywords: ['laugh', 'lol', 'tears', 'funny'] },
    { emoji: '🤣', keywords: ['rofl', 'laugh', 'rolling', 'funny'] },
    { emoji: '😇', keywords: ['angel', 'halo', 'innocent', 'good'] },
    { emoji: '🥰', keywords: ['love', 'hearts', 'adore'] },
    { emoji: '😍', keywords: ['heart eyes', 'love', 'adore'] },
    { emoji: '🤩', keywords: ['star eyes', 'excited', 'wow'] },
    { emoji: '😎', keywords: ['cool', 'sunglasses', 'awesome'] },
    { emoji: '🤗', keywords: ['hug', 'embrace', 'support'] },
    { emoji: '🤔', keywords: ['thinking', 'hmm', 'wondering'] },
    { emoji: '🤨', keywords: ['raised eyebrow', 'skeptical', 'suspicious'] },
    { emoji: '😐', keywords: ['neutral', 'meh', 'blank'] },
    { emoji: '😑', keywords: ['expressionless', 'meh', 'blank'] },
    { emoji: '😴', keywords: ['sleeping', 'zzz', 'tired', 'sleep'] },
    { emoji: '🥱', keywords: ['yawn', 'tired', 'sleepy', 'bored'] },
    { emoji: '😪', keywords: ['sleepy', 'tired', 'drowsy'] },
    { emoji: '😓', keywords: ['sweat', 'stressed', 'anxious'] },
    { emoji: '😥', keywords: ['sad', 'disappointed', 'unhappy'] },
    { emoji: '😢', keywords: ['cry', 'tears', 'sad'] },
    { emoji: '😭', keywords: ['sob', 'cry', 'tears', 'sad'] },
    { emoji: '😤', keywords: ['triumph', 'frustrated', 'annoyed'] },
    { emoji: '😠', keywords: ['angry', 'mad', 'upset'] },
    { emoji: '😡', keywords: ['rage', 'angry', 'furious'] },
    { emoji: '🤬', keywords: ['cursing', 'swearing', 'angry'] },
    { emoji: '💪', keywords: ['muscle', 'strong', 'strength', 'power', 'flex'] },
    { emoji: '👍', keywords: ['thumbs up', 'good', 'ok', 'yes', 'like'] },
    { emoji: '👎', keywords: ['thumbs down', 'bad', 'no', 'dislike'] },
    { emoji: '👏', keywords: ['clap', 'applause', 'congratulations', 'well done'] },
    { emoji: '🙌', keywords: ['raised hands', 'celebration', 'hooray', 'yay'] },
    { emoji: '👐', keywords: ['open hands', 'hug', 'embrace'] },
    { emoji: '🤝', keywords: ['handshake', 'deal', 'agreement', 'partnership'] },
    { emoji: '🙏', keywords: ['pray', 'thanks', 'please', 'gratitude'] },
    { emoji: '✊', keywords: ['fist', 'punch', 'solidarity', 'power'] },
    { emoji: '🤜', keywords: ['right fist', 'fist bump', 'punch'] },
    { emoji: '🤛', keywords: ['left fist', 'fist bump', 'punch'] },
    { emoji: '✌️', keywords: ['peace', 'victory', 'v sign'] },
    { emoji: '🤞', keywords: ['crossed fingers', 'luck', 'hope', 'wish'] },
    { emoji: '🤟', keywords: ['love-you gesture', 'sign language'] },
    { emoji: '🤘', keywords: ['rock', 'horns', 'metal'] },
    { emoji: '👌', keywords: ['ok', 'okay', 'good', 'perfect'] },
    { emoji: '👈', keywords: ['point left', 'left', 'backhand'] },
    { emoji: '👉', keywords: ['point right', 'right', 'backhand'] },
    { emoji: '👆', keywords: ['point up', 'up', 'backhand'] },
    { emoji: '👇', keywords: ['point down', 'down', 'backhand'] },
    
    // Misc Symbols
    { emoji: '💯', keywords: ['hundred', '100', 'perfect', 'full'] },
    { emoji: '🔥', keywords: ['fire', 'hot', 'lit', 'burn'] },
    { emoji: '⚡', keywords: ['lightning', 'electric', 'energy', 'fast'] },
    { emoji: '💥', keywords: ['boom', 'explosion', 'collision'] },
    { emoji: '💫', keywords: ['dizzy', 'stars', 'sparkle'] },
    { emoji: '⭐', keywords: ['star', 'favorite', 'excellent'] },
    { emoji: '🌟', keywords: ['glowing star', 'shine', 'sparkle'] },
    { emoji: '✨', keywords: ['sparkles', 'shine', 'magic', 'clean'] },
    { emoji: '💎', keywords: ['gem', 'diamond', 'jewel', 'valuable'] },
    { emoji: '🎁', keywords: ['gift', 'present', 'box', 'surprise'] },
    { emoji: '🎉', keywords: ['party', 'celebration', 'confetti', 'congratulations'] },
    { emoji: '🎊', keywords: ['confetti', 'celebration', 'party'] },
    { emoji: '🎈', keywords: ['balloon', 'party', 'celebration'] },
    { emoji: '🔔', keywords: ['bell', 'notification', 'alert', 'ring'] },
    { emoji: '🔕', keywords: ['bell with slash', 'silent', 'mute', 'no notifications'] },
    { emoji: '🎵', keywords: ['music', 'note', 'song'] },
    { emoji: '🎶', keywords: ['music', 'notes', 'song'] },
    { emoji: '🎸', keywords: ['guitar', 'music', 'instrument', 'rock'] },
    { emoji: '🎹', keywords: ['piano', 'keyboard', 'music', 'instrument'] },
    { emoji: '🎤', keywords: ['microphone', 'sing', 'karaoke', 'music'] },
    { emoji: '🎧', keywords: ['headphones', 'music', 'audio', 'listen'] },
    { emoji: '📢', keywords: ['loudspeaker', 'announcement', 'broadcast'] },
    { emoji: '📣', keywords: ['megaphone', 'announcement', 'cheer'] },
    { emoji: '🔊', keywords: ['speaker', 'loud', 'volume', 'sound'] },
    { emoji: '🔇', keywords: ['mute', 'silent', 'no sound'] },
    { emoji: '🌈', keywords: ['rainbow', 'colorful', 'pride', 'weather'] },
    { emoji: '🎨', keywords: ['art', 'palette', 'paint', 'creative'] },
    { emoji: '🖼️', keywords: ['frame', 'picture', 'art', 'photo'] },
    { emoji: '📷', keywords: ['camera', 'photo', 'picture'] },
    { emoji: '📸', keywords: ['camera with flash', 'photo', 'picture'] },
    { emoji: '🎬', keywords: ['clapper', 'movie', 'film', 'action'] },
    { emoji: '🎮', keywords: ['video game', 'controller', 'gaming', 'play'] },
    { emoji: '🎲', keywords: ['dice', 'game', 'chance', 'random'] },
    { emoji: '🎯', keywords: ['dart', 'target', 'bullseye', 'goal'] },
    { emoji: '🧩', keywords: ['puzzle', 'piece', 'game'] },
    { emoji: '🃏', keywords: ['joker', 'card', 'game', 'wild'] },
    { emoji: '🔑', keywords: ['key', 'lock', 'unlock', 'password'] },
    { emoji: '🔐', keywords: ['locked', 'secure', 'key'] },
    { emoji: '🔒', keywords: ['locked', 'secure', 'private'] },
    { emoji: '🔓', keywords: ['unlocked', 'open', 'access'] },
    { emoji: '🔍', keywords: ['search', 'magnifying glass', 'find', 'look'] },
    { emoji: '🔎', keywords: ['search', 'magnifying glass', 'find', 'zoom'] },
    { emoji: '💡', keywords: ['bulb', 'light', 'idea', 'bright'] },
    { emoji: '🔦', keywords: ['flashlight', 'light', 'torch'] },
    { emoji: '🕯️', keywords: ['candle', 'light', 'flame'] },
    { emoji: '🧲', keywords: ['magnet', 'attract', 'magnetic'] },
    { emoji: '🧨', keywords: ['firecracker', 'dynamite', 'explosive'] },
    { emoji: '💣', keywords: ['bomb', 'explosive', 'danger'] },
    { emoji: '⚠️', keywords: ['warning', 'caution', 'alert', 'danger'] },
    { emoji: '🚸', keywords: ['children crossing', 'school', 'kids'] },
    { emoji: '⛔', keywords: ['no entry', 'stop', 'prohibited'] },
    { emoji: '🚫', keywords: ['prohibited', 'no', 'ban', 'forbidden'] },
    { emoji: '🚭', keywords: ['no smoking', 'cigarette', 'prohibited'] },
    { emoji: '♻️', keywords: ['recycle', 'reuse', 'environment', 'green'] },
    { emoji: '🌍', keywords: ['earth', 'globe', 'world', 'planet'] },
    { emoji: '🌎', keywords: ['earth', 'americas', 'globe', 'world'] },
    { emoji: '🌏', keywords: ['earth', 'asia', 'globe', 'world'] },
    { emoji: '🗺️', keywords: ['map', 'world', 'navigation', 'travel'] },
    { emoji: '🧭', keywords: ['compass', 'navigation', 'direction'] },
    { emoji: '⛰️', keywords: ['mountain', 'peak', 'nature', 'hiking'] },
    { emoji: '🏔️', keywords: ['snow mountain', 'peak', 'cold'] },
    { emoji: '🗻', keywords: ['mount fuji', 'mountain', 'volcano'] },
    { emoji: '🏕️', keywords: ['camping', 'tent', 'outdoor', 'nature'] },
    { emoji: '🏖️', keywords: ['beach', 'umbrella', 'vacation', 'relax'] },
    { emoji: '🏝️', keywords: ['island', 'desert island', 'beach', 'tropical'] },
  ];
  
  // Fuzzy search function
  function fuzzySearch(query: string) {
    if (!query) return emojis;
    
    const lowerQuery = query.toLowerCase().trim();
    const words = lowerQuery.split(/\s+/);
    
    return emojis.filter(item => {
      // Check if all query words match at least one keyword
      return words.every(word => 
        item.keywords.some(keyword => keyword.includes(word))
      );
    });
  }
  
  function selectEmoji(emoji: string) {
    value = emoji;
    showPicker = false;
    dispatch('select', emoji);
    if (inputEl) inputEl.focus();
  }
  
  function handleInputClick() {
    showPicker = !showPicker;
  }
  
  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.emoji-picker-container')) {
      showPicker = false;
    }
  }
  
  onMount(() => {
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  });
  
  $: filteredEmojis = fuzzySearch(searchQuery);
</script>

<div class="emoji-picker-container">
  <input
    bind:this={inputEl}
    bind:value
    type="text"
    {placeholder}
    maxlength={maxLength}
    on:click|stopPropagation={handleInputClick}
    class="emoji-input"
  />
  
  {#if showPicker}
    <div class="emoji-picker" on:click|stopPropagation>
      <div class="picker-search">
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Search emojis... (e.g., 'car', 'workout')"
          class="search-input"
          autofocus
        />
      </div>
      
      <div class="emoji-grid">
        {#if filteredEmojis.length > 0}
          {#each filteredEmojis as item}
            <button
              type="button"
              class="emoji-button"
              on:click={() => selectEmoji(item.emoji)}
              title={item.keywords.join(', ')}
            >
              {item.emoji}
            </button>
          {/each}
        {:else}
          <div class="no-results">No emojis found for "{searchQuery}"</div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .emoji-picker-container {
    position: relative;
    width: 100%;
  }
  
  .emoji-input {
    width: 100%;
    padding: 0.5rem;
    font-size: 1.2rem;
    text-align: center;
    cursor: pointer;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.05);
    color: var(--text-primary);
    border-radius: 8px;
    transition: all 0.2s;
  }
  
  .emoji-input:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.3);
  }
  
  .emoji-input:focus {
    outline: none;
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 2px rgba(103, 254, 153, 0.2);
  }
  
  .emoji-picker {
    position: absolute;
    top: calc(100% + 0.5rem);
    left: 0;
    z-index: 1000;
    width: max(400px, 100%);
    max-height: 400px;
    background: rgba(18, 18, 18, 0.98);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(20px);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  
  .picker-search {
    padding: 0.75rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .search-input {
    width: 100%;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    color: var(--text-primary);
    font-size: 0.9rem;
  }
  
  .search-input:focus {
    outline: none;
    border-color: var(--accent-primary);
    background: rgba(255, 255, 255, 0.08);
  }
  
  .search-input::placeholder {
    color: var(--text-tertiary);
  }
  
  .emoji-grid {
    padding: 0.5rem;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(48px, 1fr));
    gap: 0.25rem;
    overflow-y: auto;
    max-height: 320px;
  }
  
  .emoji-grid::-webkit-scrollbar {
    width: 8px;
  }
  
  .emoji-grid::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
  }
  
  .emoji-grid::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
  }
  
  .emoji-grid::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }
  
  .emoji-button {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    border: 1px solid transparent;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s;
    padding: 0;
  }
  
  .emoji-button:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--accent-primary);
    transform: scale(1.1);
  }
  
  .emoji-button:active {
    transform: scale(0.95);
  }
  
  .no-results {
    grid-column: 1 / -1;
    padding: 2rem;
    text-align: center;
    color: var(--text-tertiary);
    font-size: 0.9rem;
  }
</style>
