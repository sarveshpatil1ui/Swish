import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Smile, Heart, Users, Cat, Utensils, Trophy, Car, Lightbulb, Hash } from 'lucide-react'

export const EMOJI_CATEGORIES = [
  {
    id: 'smileys',
    name: 'Smileys & Emotion',
    icon: Smile,
    emojis: [
      { char: '😀', keywords: ['grinning', 'happy', 'smile'] },
      { char: '😃', keywords: ['smiley', 'happy', 'joy'] },
      { char: '😄', keywords: ['smile', 'laugh', 'happy'] },
      { char: '😁', keywords: ['beam', 'grin', 'teeth'] },
      { char: '😆', keywords: ['laugh', 'satisfied', 'haha'] },
      { char: '😅', keywords: ['sweat', 'smile', 'relief'] },
      { char: '🤣', keywords: ['rofl', 'rolling', 'laughing', 'lol'] },
      { char: '😂', keywords: ['joy', 'tears', 'crying', 'lol', 'haha'] },
      { char: '🙂', keywords: ['slightly', 'smiling', 'okay'] },
      { char: '🙃', keywords: ['upside-down', 'silly', 'irony'] },
      { char: '🫠', keywords: ['melting', 'hot', 'sarcasm'] },
      { char: '😉', keywords: ['wink', 'flirt'] },
      { char: '😊', keywords: ['blush', 'proud', 'warm'] },
      { char: '😇', keywords: ['innocent', 'halo', 'angel'] },
      { char: '🥰', keywords: ['love', 'hearts', 'crush'] },
      { char: '😍', keywords: ['heart', 'eyes', 'love'] },
      { char: '🤩', keywords: ['star-struck', 'excited', 'wow'] },
      { char: '😘', keywords: ['kiss', 'blow', 'love'] },
      { char: '😗', keywords: ['kissing'] },
      { char: '😚', keywords: ['kiss', 'closed', 'eyes'] },
      { char: '😙', keywords: ['kissing', 'smiling'] },
      { char: '😋', keywords: ['yum', 'delicious', 'tasty'] },
      { char: '😛', keywords: ['tongue', 'playful'] },
      { char: '😜', keywords: ['wink', 'tongue', 'crazy'] },
      { char: '🤪', keywords: ['zany', 'wild', 'goofy'] },
      { char: '😝', keywords: ['squint', 'tongue'] },
      { char: '🤑', keywords: ['money', 'rich', 'dollar'] },
      { char: '🤗', keywords: ['hugs', 'warmth', 'welcome'] },
      { char: '🫣', keywords: ['peeking', 'shy', 'scared'] },
      { char: '🤫', keywords: ['shh', 'quiet', 'secret'] },
      { char: '🫡', keywords: ['salute', 'respect', 'yes'] },
      { char: '🤔', keywords: ['thinking', 'hmm', 'wonder'] },
      { char: '🫢', keywords: ['gasp', 'shock', 'oops'] },
      { char: '🤭', keywords: ['giggle', 'oops', 'secret'] },
      { char: '🤫', keywords: ['quiet', 'hush'] },
      { char: '🤨', keywords: ['skeptical', 'eyebrow', 'doubt'] },
      { char: '😐', keywords: ['neutral', 'meh', 'straight'] },
      { char: '😑', keywords: ['expressionless', 'unimpressed'] },
      { char: '😶', keywords: ['mute', 'silent', 'speechless'] },
      { char: '🫥', keywords: ['dotted', 'invisible', 'hide'] },
      { char: '😏', keywords: ['smirk', 'flirt', 'cool'] },
      { char: '😒', keywords: ['unamused', 'bored', 'side-eye'] },
      { char: '🙄', keywords: ['eye-roll', 'whatever'] },
      { char: '😬', keywords: ['grimace', 'awkward', 'cringe'] },
      { char: '🤥', keywords: ['lying', 'pinocchio', 'fake'] },
      { char: '😌', keywords: ['relieved', 'peace', 'zen'] },
      { char: '😔', keywords: ['pensive', 'sad', 'down'] },
      { char: '😪', keywords: ['sleepy', 'tired'] },
      { char: '🤤', keywords: ['drooling', 'craving'] },
      { char: '😴', keywords: ['sleeping', 'zzz', 'night'] },
      { char: '😷', keywords: ['mask', 'sick', 'virus'] },
      { char: '🤒', keywords: ['fever', 'thermometer', 'ill'] },
      { char: '🤕', keywords: ['bandage', 'hurt', 'injury'] },
      { char: '🤢', keywords: ['nauseated', 'gross', 'sick'] },
      { char: '🤮', keywords: ['vomit', 'barf', 'disgust'] },
      { char: '🤧', keywords: ['sneezing', 'cold'] },
      { char: '🥵', keywords: ['hot', 'sweat', 'summer'] },
      { char: '🥶', keywords: ['cold', 'freezing', 'ice'] },
      { char: '🥴', keywords: ['woozy', 'drunk', 'dizzy'] },
      { char: '😵', keywords: ['dizzy', 'knocked out'] },
      { char: '😵‍💫', keywords: ['spiral', 'hypnotized'] },
      { char: '🤯', keywords: ['mind blown', 'exploding', 'shock'] },
      { char: '🤠', keywords: ['cowboy', 'hat', 'yeehaw'] },
      { char: '🥳', keywords: ['party', 'celebrate', 'birthday'] },
      { char: '🥸', keywords: ['disguise', 'mustache', 'glasses'] },
      { char: '😎', keywords: ['cool', 'sunglasses', 'confident'] },
      { char: '🤓', keywords: ['nerd', 'geek', 'glasses'] },
      { char: '🧐', keywords: ['monocle', 'curious', 'investigate'] },
      { char: '😕', keywords: ['confused', 'puzzled'] },
      { char: '😟', keywords: ['worried', 'nervous'] },
      { char: '🙁', keywords: ['frown', 'sad'] },
      { char: '☹️', keywords: ['sad', 'frown', 'unhappy'] },
      { char: '😮', keywords: ['open mouth', 'surprised'] },
      { char: '😯', keywords: ['hushed', 'silent'] },
      { char: '😲', keywords: ['astonished', 'gasp'] },
      { char: '😳', keywords: ['flushed', 'embarrassed', 'shock'] },
      { char: '🥺', keywords: ['pleading', 'puppy eyes', 'beg'] },
      { char: '🥹', keywords: ['holding back tears', 'proud', 'moved'] },
      { char: '😦', keywords: ['frowning', 'open mouth'] },
      { char: '😧', keywords: ['anguished', 'scared'] },
      { char: '😨', keywords: ['fearful', 'scared'] },
      { char: '😰', keywords: ['anxious', 'cold sweat'] },
      { char: '😥', keywords: ['sad', 'relieved', 'phew'] },
      { char: '😢', keywords: ['cry', 'tear', 'sad'] },
      { char: '😭', keywords: ['sob', 'crying', 'loudly', 'tears'] },
      { char: '😱', keywords: ['scream', 'fear', 'horror'] },
      { char: '😖', keywords: ['confounded', 'frustrated'] },
      { char: '😣', keywords: ['persevering', 'struggling'] },
      { char: '😞', keywords: ['disappointed', 'upset'] },
      { char: '😓', keywords: ['downcast', 'sweat'] },
      { char: '😩', keywords: ['weary', 'tired'] },
      { char: '😫', keywords: ['tired', 'exhausted'] },
      { char: '🥱', keywords: ['yawn', 'sleepy', 'bored'] },
      { char: '😤', keywords: ['triumph', 'steam', 'frustrated'] },
      { char: '😡', keywords: ['enraged', 'pout', 'angry'] },
      { char: '😠', keywords: ['angry', 'mad', 'grumpy'] },
      { char: '🤬', keywords: ['swearing', 'cussing', 'furious'] },
      { char: '😈', keywords: ['devil', 'mischief', 'smile'] },
      { char: '👿', keywords: ['devil', 'angry', 'evil'] },
      { char: '💀', keywords: ['skull', 'dead', 'skeleton', 'lol'] },
      { char: '☠️', keywords: ['crossbones', 'danger', 'pirate'] },
      { char: '💩', keywords: ['poop', 'crap', 'pile'] },
      { char: '🤡', keywords: ['clown', 'fool', 'joke'] },
      { char: '👹', keywords: ['ogre', 'monster'] },
      { char: '👺', keywords: ['goblin', 'mask'] },
      { char: '👻', keywords: ['ghost', 'boo', 'spooky'] },
      { char: '👽', keywords: ['alien', 'ufo', 'space'] },
      { char: '👾', keywords: ['monster', 'arcade', 'retro'] },
      { char: '🤖', keywords: ['robot', 'bot', 'tech'] },
    ],
  },
  {
    id: 'hearts',
    name: 'Hearts & Gestures',
    icon: Heart,
    emojis: [
      { char: '❤️', keywords: ['heart', 'love', 'red'] },
      { char: '🧡', keywords: ['heart', 'orange'] },
      { char: '💛', keywords: ['heart', 'yellow'] },
      { char: '💚', keywords: ['heart', 'green'] },
      { char: '💙', keywords: ['heart', 'blue'] },
      { char: '💜', keywords: ['heart', 'purple'] },
      { char: '🖤', keywords: ['heart', 'black'] },
      { char: '🤍', keywords: ['heart', 'white'] },
      { char: '🤎', keywords: ['heart', 'brown'] },
      { char: '💔', keywords: ['broken heart', 'heartbreak'] },
      { char: '❤️‍🔥', keywords: ['heart on fire', 'passion', 'burning'] },
      { char: '❤️‍🩹', keywords: ['mending heart', 'healing'] },
      { char: '❣️', keywords: ['heart exclamation'] },
      { char: '💕', keywords: ['two hearts', 'pink'] },
      { char: '💞', keywords: ['revolving hearts'] },
      { char: '💓', keywords: ['beating heart'] },
      { char: '💗', keywords: ['growing heart'] },
      { char: '💖', keywords: ['sparkling heart'] },
      { char: '💘', keywords: ['heart with arrow', 'cupid'] },
      { char: '💝', keywords: ['heart with ribbon'] },
      { char: '💟', keywords: ['heart decoration'] },
      { char: '👋', keywords: ['wave', 'hello', 'bye'] },
      { char: '🤚', keywords: ['raised back of hand'] },
      { char: '🖐️', keywords: ['hand splayed', 'five'] },
      { char: '✋', keywords: ['raised hand', 'stop', 'high five'] },
      { char: '🖖', keywords: ['vulcan', 'spock'] },
      { char: '🫱', keywords: ['hand right'] },
      { char: '🫲', keywords: ['hand left'] },
      { char: '🫳', keywords: ['palm down'] },
      { char: '🫴', keywords: ['palm up'] },
      { char: '👌', keywords: ['ok', 'perfect'] },
      { char: '🤌', keywords: ['pinched fingers', 'italian'] },
      { char: '🤏', keywords: ['pinching hand', 'small', 'little'] },
      { char: '✌️', keywords: ['peace', 'victory', 'two'] },
      { char: '🤞', keywords: ['crossed fingers', 'luck', 'hope'] },
      { char: '🫰', keywords: ['hand with index and thumb', 'finger heart'] },
      { char: '🤟', keywords: ['love you gesture', 'ily'] },
      { char: '🤘', keywords: ['rock on', 'horns'] },
      { char: '🤙', keywords: ['call me', 'shaka'] },
      { char: '👈', keywords: ['point left'] },
      { char: '👉', keywords: ['point right'] },
      { char: '👆', keywords: ['point up'] },
      { char: '🖕', keywords: ['middle finger'] },
      { char: '👇', keywords: ['point down'] },
      { char: '☝️', keywords: ['index up', 'one'] },
      { char: '🫵', keywords: ['point at you'] },
      { char: '👍', keywords: ['thumbs up', 'like', 'approve', 'yes'] },
      { char: '👎', keywords: ['thumbs down', 'dislike', 'no'] },
      { char: '✊', keywords: ['raised fist', 'power'] },
      { char: '👊', keywords: ['fist bump', 'punch'] },
      { char: '🤛', keywords: ['left fist'] },
      { char: '🤜', keywords: ['right fist'] },
      { char: '👏', keywords: ['clap', 'applause', 'bravo'] },
      { char: '🙌', keywords: ['raising hands', 'celebrate', 'praise'] },
      { char: '🫶', keywords: ['heart hands', 'love'] },
      { char: '👐', keywords: ['open hands'] },
      { char: '🤲', keywords: ['palms up together', 'prayer'] },
      { char: '🤝', keywords: ['handshake', 'deal', 'agreement'] },
      { char: '🙏', keywords: ['folded hands', 'pray', 'thanks', 'please'] },
      { char: '✍️', keywords: ['writing hand'] },
      { char: '💅', keywords: ['nail polish', 'slay'] },
      { char: '🤳', keywords: ['selfie', 'phone', 'camera'] },
      { char: '💪', keywords: ['biceps', 'flex', 'strong', 'muscle'] },
      { char: '👂', keywords: ['ear', 'listen'] },
      { char: '👃', keywords: ['nose', 'smell'] },
      { char: '🧠', keywords: ['brain', 'smart', 'mind'] },
      { char: '🫀', keywords: ['anatomical heart'] },
      { char: '🫁', keywords: ['lungs'] },
      { char: '🦷', keywords: ['tooth', 'teeth'] },
      { char: '👀', keywords: ['eyes', 'look', 'see'] },
      { char: '👅', keywords: ['tongue', 'lick'] },
      { char: '👄', keywords: ['mouth', 'lips'] },
      { char: '💋', keywords: ['kiss mark'] },
    ],
  },
  {
    id: 'people',
    name: 'People',
    icon: Users,
    emojis: [
      { char: '👶', keywords: ['baby', 'infant'] },
      { char: '🧒', keywords: ['child', 'kid'] },
      { char: '👦', keywords: ['boy', 'kid'] },
      { char: '👧', keywords: ['girl', 'kid'] },
      { char: '🧑', keywords: ['person', 'adult'] },
      { char: '👱', keywords: ['blond'] },
      { char: '👨', keywords: ['man', 'male'] },
      { char: '🧔', keywords: ['beard', 'man'] },
      { char: '👩', keywords: ['woman', 'female'] },
      { char: '🧓', keywords: ['older person'] },
      { char: '👴', keywords: ['old man', 'grandpa'] },
      { char: '👵', keywords: ['old woman', 'grandma'] },
      { char: '👮', keywords: ['police', 'cop'] },
      { char: '🕵️', keywords: ['detective', 'spy'] },
      { char: '💂', keywords: ['guard'] },
      { char: '🥷', keywords: ['ninja', 'stealth'] },
      { char: '👷', keywords: ['construction worker'] },
      { char: '🤴', keywords: ['prince'] },
      { char: '👸', keywords: ['princess'] },
      { char: '👳', keywords: ['turban'] },
      { char: '👲', keywords: ['skullcap'] },
      { char: '🧕', keywords: ['hijab'] },
      { char: '🤵', keywords: ['tuxedo', 'groom'] },
      { char: '👰', keywords: ['bride', 'veil'] },
      { char: '🤰', keywords: ['pregnant'] },
      { char: '👼', keywords: ['angel', 'cherub'] },
      { char: '🦸', keywords: ['superhero', 'hero'] },
      { char: '🦹', keywords: ['supervillain', 'villain'] },
      { char: '🧙', keywords: ['mage', 'wizard'] },
      { char: '🧚', keywords: ['fairy'] },
      { char: '🧛', keywords: ['vampire', 'dracula'] },
      { char: '🧜', keywords: ['merperson', 'mermaid'] },
      { char: '🧝', keywords: ['elf'] },
      { char: '🧞', keywords: ['genie'] },
      { char: '🧟', keywords: ['zombie'] },
      { char: '🙇', keywords: ['bowing', 'respect', 'apology'] },
      { char: '🤦', keywords: ['facepalm'] },
      { char: '🤷', keywords: ['shrug', 'idk'] },
      { char: '🚶', keywords: ['walking', 'pedestrian'] },
      { char: '🏃', keywords: ['running', 'jogging', 'fast'] },
      { char: '💃', keywords: ['dancing woman', 'party'] },
      { char: '🕺', keywords: ['dancing man', 'disco'] },
      { char: '🧖', keywords: ['sauna', 'spa'] },
      { char: '🧗', keywords: ['climbing'] },
      { char: '🧘', keywords: ['meditation', 'yoga'] },
    ],
  },
  {
    id: 'animals',
    name: 'Animals & Nature',
    icon: Cat,
    emojis: [
      { char: '🐶', keywords: ['dog', 'puppy', 'pet'] },
      { char: '🐱', keywords: ['cat', 'kitten', 'pet'] },
      { char: '🐭', keywords: ['mouse'] },
      { char: '🐹', keywords: ['hamster'] },
      { char: '🐰', keywords: ['rabbit', 'bunny'] },
      { char: '🦊', keywords: ['fox'] },
      { char: '🐻', keywords: ['bear'] },
      { char: '🐼', keywords: ['panda'] },
      { char: '🐨', keywords: ['koala'] },
      { char: '🐯', keywords: ['tiger'] },
      { char: '🦁', keywords: ['lion', 'king'] },
      { char: '🐮', keywords: ['cow'] },
      { char: '🐷', keywords: ['pig'] },
      { char: '🐸', keywords: ['frog'] },
      { char: '🐵', keywords: ['monkey'] },
      { char: '🙈', keywords: ['see no evil'] },
      { char: '🙉', keywords: ['hear no evil'] },
      { char: '🙊', keywords: ['speak no evil'] },
      { char: '🐔', keywords: ['chicken'] },
      { char: '🐧', keywords: ['penguin'] },
      { char: '🐦', keywords: ['bird'] },
      { char: '🐤', keywords: ['chick'] },
      { char: '🦆', keywords: ['duck'] },
      { char: '🦅', keywords: ['eagle'] },
      { char: '🦉', keywords: ['owl'] },
      { char: '🦇', keywords: ['bat'] },
      { char: '🐺', keywords: ['wolf'] },
      { char: '🐗', keywords: ['boar'] },
      { char: '🐴', keywords: ['horse'] },
      { char: '🦄', keywords: ['unicorn', 'magic'] },
      { char: '🐝', keywords: ['bee', 'honey'] },
      { char: '🐛', keywords: ['bug', 'caterpillar'] },
      { char: '🦋', keywords: ['butterfly'] },
      { char: '🐌', keywords: ['snail'] },
      { char: '🐞', keywords: ['ladybug'] },
      { char: '🐜', keywords: ['ant'] },
      { char: '🐢', keywords: ['turtle'] },
      { char: '🐍', keywords: ['snake'] },
      { char: '🦎', keywords: ['lizard'] },
      { char: '🦖', keywords: ['t-rex', 'dinosaur'] },
      { char: '🦕', keywords: ['sauropod'] },
      { char: '🐙', keywords: ['octopus'] },
      { char: '🦑', keywords: ['squid'] },
      { char: '🦐', keywords: ['shrimp'] },
      { char: '🦞', keywords: ['lobster'] },
      { char: '🦀', keywords: ['crab'] },
      { char: '🐡', keywords: ['blowfish'] },
      { char: '🐠', keywords: ['tropical fish'] },
      { char: '🐟', keywords: ['fish'] },
      { char: '🐬', keywords: ['dolphin'] },
      { char: '🐳', keywords: ['spouting whale'] },
      { char: '🦈', keywords: ['shark'] },
      { char: '🐊', keywords: ['crocodile'] },
      { char: '🌲', keywords: ['evergreen tree'] },
      { char: '🌳', keywords: ['tree'] },
      { char: '🌴', keywords: ['palm tree'] },
      { char: '🌱', keywords: ['seedling'] },
      { char: '🌿', keywords: ['herb'] },
      { char: '☘️', keywords: ['shamrock'] },
      { char: '🍀', keywords: ['four leaf clover', 'lucky'] },
      { char: '🪴', keywords: ['potted plant'] },
      { char: '🍁', keywords: ['maple leaf', 'autumn'] },
      { char: '🍄', keywords: ['mushroom'] },
      { char: '💐', keywords: ['bouquet', 'flowers'] },
      { char: '🌷', keywords: ['tulip'] },
      { char: '🌹', keywords: ['rose', 'romantic'] },
      { char: '🥀', keywords: ['wilted flower'] },
      { char: '🌺', keywords: ['hibiscus'] },
      { char: '🌸', keywords: ['cherry blossom'] },
      { char: '🌼', keywords: ['blossom'] },
      { char: '🌻', keywords: ['sunflower'] },
      { char: '🌞', keywords: ['sun with face'] },
      { char: '🌙', keywords: ['crescent moon'] },
      { char: '⭐', keywords: ['star'] },
      { char: '🌟', keywords: ['glowing star'] },
      { char: '✨', keywords: ['sparkles', 'magic'] },
      { char: '⚡', keywords: ['high voltage', 'lightning'] },
      { char: '🔥', keywords: ['fire', 'flame', 'lit'] },
      { char: '🌈', keywords: ['rainbow'] },
      { char: '☀️', keywords: ['sun', 'sunny'] },
      { char: '☁️', keywords: ['cloud'] },
      { char: '🌧️', keywords: ['cloud with rain'] },
      { char: '❄️', keywords: ['snowflake', 'cold'] },
    ],
  },
  {
    id: 'food',
    name: 'Food & Drink',
    icon: Utensils,
    emojis: [
      { char: '🍏', keywords: ['green apple'] },
      { char: '🍎', keywords: ['red apple'] },
      { char: '🍐', keywords: ['pear'] },
      { char: '🍊', keywords: ['tangerine', 'orange'] },
      { char: '🍋', keywords: ['lemon'] },
      { char: '🍌', keywords: ['banana'] },
      { char: '🍉', keywords: ['watermelon'] },
      { char: '🍇', keywords: ['grapes'] },
      { char: '🍓', keywords: ['strawberry'] },
      { char: '🫐', keywords: ['blueberries'] },
      { char: '🍒', keywords: ['cherries'] },
      { char: '🍑', keywords: ['peach'] },
      { char: '🥭', keywords: ['mango'] },
      { char: '🍍', keywords: ['pineapple'] },
      { char: '🥥', keywords: ['coconut'] },
      { char: '🥝', keywords: ['kiwi'] },
      { char: '🥑', keywords: ['avocado'] },
      { char: '🍔', keywords: ['hamburger', 'burger'] },
      { char: '🍟', keywords: ['french fries', 'chips'] },
      { char: '🍕', keywords: ['pizza', 'slice'] },
      { char: '🌭', keywords: ['hot dog'] },
      { char: '🥪', keywords: ['sandwich'] },
      { char: '🌮', keywords: ['taco'] },
      { char: '🌯', keywords: ['burrito'] },
      { char: '🥙', keywords: ['stuffed flatbread'] },
      { char: '🧆', keywords: ['falafel'] },
      { char: '🥗', keywords: ['green salad'] },
      { char: '🍝', keywords: ['spaghetti', 'pasta'] },
      { char: '🍜', keywords: ['ramen', 'noodles'] },
      { char: '🍲', keywords: ['pot of food'] },
      { char: '🍛', keywords: ['curry rice'] },
      { char: '🍣', keywords: ['sushi'] },
      { char: '🍱', keywords: ['bento box'] },
      { char: '🥟', keywords: ['dumpling'] },
      { char: '🍤', keywords: ['fried shrimp'] },
      { char: '🍙', keywords: ['rice ball'] },
      { char: '🍚', keywords: ['cooked rice'] },
      { char: '🍦', keywords: ['soft ice cream'] },
      { char: '🍧', keywords: ['shaved ice'] },
      { char: '🍨', keywords: ['ice cream'] },
      { char: '🍩', keywords: ['doughnut', 'donut'] },
      { char: '🍪', keywords: ['cookie'] },
      { char: '🎂', keywords: ['birthday cake'] },
      { char: '🍰', keywords: ['shortcake'] },
      { char: '🧁', keywords: ['cupcake'] },
      { char: '🥧', keywords: ['pie'] },
      { char: '🍫', keywords: ['chocolate bar'] },
      { char: '🍬', keywords: ['candy'] },
      { char: '🍭', keywords: ['lollipop'] },
      { char: '🍮', keywords: ['custard', 'pudding'] },
      { char: '🍯', keywords: ['honey pot'] },
      { char: '🍿', keywords: ['popcorn'] },
      { char: '☕', keywords: ['coffee', 'tea', 'cafe'] },
      { char: '🫖', keywords: ['teapot'] },
      { char: '🍵', keywords: ['teacup', 'green tea'] },
      { char: '🧃', keywords: ['beverage box', 'juice'] },
      { char: '🥤', keywords: ['cup with straw', 'soda'] },
      { char: '🧋', keywords: ['bubble tea', 'boba'] },
      { char: '🍺', keywords: ['beer mug'] },
      { char: '🍻', keywords: ['clinking beer mugs', 'cheers'] },
      { char: '🥂', keywords: ['clinking glasses', 'champagne'] },
      { char: '🍷', keywords: ['wine glass'] },
      { char: '🍸', keywords: ['cocktail'] },
      { char: '🍹', keywords: ['tropical drink'] },
      { char: '🍾', keywords: ['bottle with popping cork'] },
    ],
  },
  {
    id: 'activities',
    name: 'Activities & Sports',
    icon: Trophy,
    emojis: [
      { char: '⚽', keywords: ['soccer ball', 'football'] },
      { char: '🏀', keywords: ['basketball'] },
      { char: '🏈', keywords: ['american football'] },
      { char: '⚾', keywords: ['baseball'] },
      { char: '🥎', keywords: ['softball'] },
      { char: '🎾', keywords: ['tennis'] },
      { char: '🏐', keywords: ['volleyball'] },
      { char: '🏉', keywords: ['rugby'] },
      { char: '🥏', keywords: ['frisbee'] },
      { char: '🎱', keywords: ['pool', 'billiards', '8 ball'] },
      { char: '🏓', keywords: ['ping pong', 'table tennis'] },
      { char: '🏸', keywords: ['badminton'] },
      { char: '🏒', keywords: ['ice hockey'] },
      { char: '🏑', keywords: ['field hockey'] },
      { char: '🏏', keywords: ['cricket'] },
      { char: '⛳', keywords: ['golf'] },
      { char: '🏹', keywords: ['bow and arrow', 'archery'] },
      { char: '🥊', keywords: ['boxing glove'] },
      { char: '🥋', keywords: ['martial arts'] },
      { char: '🛹', keywords: ['skateboard'] },
      { char: '🛼', keywords: ['roller skate'] },
      { char: '🎿', keywords: ['skis'] },
      { char: '🏋️', keywords: ['weight lifting', 'gym'] },
      { char: '🏆', keywords: ['trophy', 'champion', 'winner'] },
      { char: '🥇', keywords: ['1st place medal', 'gold'] },
      { char: '🥈', keywords: ['2nd place medal', 'silver'] },
      { char: '🥉', keywords: ['3rd place medal', 'bronze'] },
      { char: '🏅', keywords: ['sports medal'] },
      { char: '🎖️', keywords: ['military medal'] },
      { char: '🎫', keywords: ['ticket'] },
      { char: '🎟️', keywords: ['admission tickets'] },
      { char: '🎪', keywords: ['circus tent'] },
      { char: '🎨', keywords: ['artist palette', 'art'] },
      { char: '🎬', keywords: ['clapper board', 'movie'] },
      { char: '🎤', keywords: ['microphone', 'sing'] },
      { char: '🎧', keywords: ['headphones', 'music'] },
      { char: '🎼', keywords: ['musical score'] },
      { char: '🎹', keywords: ['musical keyboard', 'piano'] },
      { char: '🥁', keywords: ['drum'] },
      { char: '🎷', keywords: ['saxophone'] },
      { char: '🎺', keywords: ['trumpet'] },
      { char: '🎸', keywords: ['guitar', 'rock'] },
      { char: '🎻', keywords: ['violin'] },
      { char: '🎲', keywords: ['game die', 'dice'] },
      { char: '🎯', keywords: ['bullseye', 'target', 'dart'] },
      { char: '🎳', keywords: ['bowling'] },
      { char: '🎮', keywords: ['video game', 'controller'] },
      { char: '🧩', keywords: ['puzzle piece'] },
    ],
  },
  {
    id: 'travel',
    name: 'Travel & Places',
    icon: Car,
    emojis: [
      { char: '🚗', keywords: ['automobile', 'car'] },
      { char: '🚕', keywords: ['taxi', 'cab'] },
      { char: '🚙', keywords: ['suv'] },
      { char: '🚌', keywords: ['bus'] },
      { char: '🏎️', keywords: ['racing car'] },
      { char: '🚓', keywords: ['police car'] },
      { char: '🚑', keywords: ['ambulance'] },
      { char: '🚒', keywords: ['fire engine'] },
      { char: '🚐', keywords: ['minibus'] },
      { char: '🛻', keywords: ['pickup truck'] },
      { char: '🚚', keywords: ['delivery truck'] },
      { char: '🛵', keywords: ['motor scooter'] },
      { char: '🏍️', keywords: ['motorcycle', 'bike'] },
      { char: '🚲', keywords: ['bicycle', 'bike'] },
      { char: '🛴', keywords: ['kick scooter'] },
      { char: '🚨', keywords: ['police car light', 'emergency', 'siren'] },
      { char: '✈️', keywords: ['airplane', 'flight', 'travel'] },
      { char: '🛫', keywords: ['airplane departure'] },
      { char: '🛬', keywords: ['airplane arrival'] },
      { char: '🚀', keywords: ['rocket', 'space', 'launch'] },
      { char: '🛸', keywords: ['flying saucer', 'ufo'] },
      { char: '🚁', keywords: ['helicopter'] },
      { char: '🛶', keywords: ['canoe'] },
      { char: '⛵', keywords: ['sailboat'] },
      { char: '🛳️', keywords: ['passenger ship', 'cruise'] },
      { char: '⚓', keywords: ['anchor'] },
      { char: '⛽', keywords: ['fuel pump', 'gas'] },
      { char: '🚦', keywords: ['vertical traffic light'] },
      { char: '🗺️', keywords: ['world map'] },
      { char: '🗿', keywords: ['moai', 'statue'] },
      { char: '🗽', keywords: ['statue of liberty'] },
      { char: '🗼', keywords: ['tokyo tower'] },
      { char: '🏰', keywords: ['castle'] },
      { char: '🏖️', keywords: ['beach with umbrella', 'vacation'] },
      { char: '🏝️', keywords: ['desert island'] },
      { char: '🌋', keywords: ['volcano'] },
      { char: '⛰️', keywords: ['mountain'] },
      { char: '🏔️', keywords: ['snow-capped mountain'] },
      { char: '🏕️', keywords: ['camping'] },
      { char: '🏠', keywords: ['house', 'home'] },
      { char: '🏡', keywords: ['house with garden'] },
      { char: '🏢', keywords: ['office building'] },
      { char: '🏫', keywords: ['school', 'campus', 'college'] },
      { char: '🏥', keywords: ['hospital'] },
      { char: '🏦', keywords: ['bank'] },
      { char: '🏨', keywords: ['hotel'] },
    ],
  },
  {
    id: 'objects',
    name: 'Objects',
    icon: Lightbulb,
    emojis: [
      { char: '⌚', keywords: ['watch', 'time'] },
      { char: '📱', keywords: ['mobile phone', 'smartphone'] },
      { char: '💻', keywords: ['laptop', 'computer'] },
      { char: '🖥️', keywords: ['desktop computer'] },
      { char: '📷', keywords: ['camera', 'photo'] },
      { char: '📸', keywords: ['camera with flash'] },
      { char: '📹', keywords: ['video camera'] },
      { char: '📺', keywords: ['television', 'tv'] },
      { char: '📻', keywords: ['radio'] },
      { char: '🎙️', keywords: ['studio microphone'] },
      { char: '⏰', keywords: ['alarm clock'] },
      { char: '⌛', keywords: ['hourglass'] },
      { char: '⏳', keywords: ['hourglass done'] },
      { char: '💡', keywords: ['light bulb', 'idea'] },
      { char: '🔦', keywords: ['flashlight'] },
      { char: '🕯️', keywords: ['candle'] },
      { char: '💵', keywords: ['dollar banknote', 'money'] },
      { char: '💰', keywords: ['money bag', 'cash', 'rich'] },
      { char: '💳', keywords: ['credit card'] },
      { char: '💎', keywords: ['gem stone', 'diamond'] },
      { char: '🔑', keywords: ['key', 'lock'] },
      { char: '🗝️', keywords: ['old key'] },
      { char: '🔒', keywords: ['locked'] },
      { char: '🔓', keywords: ['unlocked'] },
      { char: '🔨', keywords: ['hammer', 'tool'] },
      { char: '🪛', keywords: ['screwdriver'] },
      { char: '🔧', keywords: ['wrench'] },
      { char: '📦', keywords: ['package', 'box'] },
      { char: '✉️', keywords: ['envelope', 'mail', 'letter'] },
      { char: '📫', keywords: ['mailbox'] },
      { char: '📝', keywords: ['memo', 'note'] },
      { char: '📁', keywords: ['file folder'] },
      { char: '📂', keywords: ['open file folder'] },
      { char: '📅', keywords: ['calendar', 'date'] },
      { char: '📚', keywords: ['books', 'study'] },
      { char: '📖', keywords: ['open book'] },
      { char: '🔗', keywords: ['link'] },
      { char: '📎', keywords: ['paperclip'] },
      { char: '📌', keywords: ['pushpin'] },
      { char: '📍', keywords: ['round pushpin', 'location'] },
      { char: '🔍', keywords: ['magnifying glass', 'search'] },
      { char: '🔎', keywords: ['magnifying glass right'] },
      { char: '🎁', keywords: ['wrapped gift', 'present'] },
      { char: '🎈', keywords: ['balloon'] },
      { char: '🎉', keywords: ['party popper', 'celebration'] },
      { char: '🎊', keywords: ['confetti ball'] },
      { char: '🛍️', keywords: ['shopping bags'] },
      { char: '🛒', keywords: ['shopping cart'] },
    ],
  },
  {
    id: 'symbols',
    name: 'Symbols & Flags',
    icon: Hash,
    emojis: [
      { char: '💯', keywords: ['hundred points', '100', 'perfect'] },
      { char: '💢', keywords: ['anger symbol'] },
      { char: '💬', keywords: ['speech balloon', 'chat', 'message'] },
      { char: '💭', keywords: ['thought balloon'] },
      { char: '💤', keywords: ['zzz', 'sleep'] },
      { char: '♨️', keywords: ['hot springs'] },
      { char: '🛑', keywords: ['stop sign'] },
      { char: '⚠️', keywords: ['warning', 'alert'] },
      { char: '⛔', keywords: ['no entry'] },
      { char: '🚫', keywords: ['prohibited'] },
      { char: '✅', keywords: ['check mark button', 'correct', 'yes'] },
      { char: '✔️', keywords: ['check mark'] },
      { char: '❌', keywords: ['cross mark', 'x', 'no'] },
      { char: '❓', keywords: ['question mark'] },
      { char: '❗', keywords: ['exclamation mark'] },
      { char: '➕', keywords: ['plus'] },
      { char: '➖', keywords: ['minus'] },
      { char: '➗', keywords: ['division'] },
      { char: '♾️', keywords: ['infinity'] },
      { char: '🎵', keywords: ['musical note'] },
      { char: '🎶', keywords: ['musical notes'] },
      { char: '🔔', keywords: ['bell', 'notification'] },
      { char: '🔕', keywords: ['bell with slash', 'mute'] },
      { char: '🇮🇳', keywords: ['india', 'flag'] },
      { char: '🇺🇸', keywords: ['united states', 'usa', 'flag'] },
      { char: '🇬🇧', keywords: ['united kingdom', 'uk', 'flag'] },
      { char: '🇨🇦', keywords: ['canada', 'flag'] },
      { char: '🇦🇺', keywords: ['australia', 'flag'] },
      { char: '🇩🇪', keywords: ['germany', 'flag'] },
      { char: '🇫🇷', keywords: ['france', 'flag'] },
      { char: '🇯🇵', keywords: ['japan', 'flag'] },
      { char: '🇰🇷', keywords: ['south korea', 'flag'] },
      { char: '🇧🇷', keywords: ['brazil', 'flag'] },
      { char: '🏁', keywords: ['chequered flag'] },
      { char: '🚩', keywords: ['triangular flag'] },
      { char: '🏳️‍🌈', keywords: ['rainbow flag', 'pride'] },
      { char: '🏴‍☠️', keywords: ['pirate flag'] },
    ],
  },
]

export default function EmojiPicker({ onSelect, onClose }) {
  const [activeCategory, setActiveCategory] = useState(EMOJI_CATEGORIES[0].id)
  const [search, setSearch] = useState('')
  const pickerRef = useRef(null)

  // Close on Escape or click outside
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  const filteredEmojis = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) {
      const cat = EMOJI_CATEGORIES.find(c => c.id === activeCategory)
      return cat ? cat.emojis : []
    }
    const all = []
    for (const cat of EMOJI_CATEGORIES) {
      for (const item of cat.emojis) {
        if (item.char === q || item.keywords.some(k => k.includes(q))) {
          all.push(item)
        }
      }
    }
    return all
  }, [search, activeCategory])

  return (
    <motion.div
      ref={pickerRef}
      initial={{ opacity: 0, scale: 0.92, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 12 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="absolute bottom-12 right-0 z-50 w-[300px] sm:w-[350px] max-w-[calc(100vw-32px)] bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      style={{ height: '390px' }}
      onClick={e => e.stopPropagation()}
    >
      {/* Search Header */}
      <div className="p-3 border-b border-slate-100 dark:border-gray-800 flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search all emojis…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-7 py-1.5 bg-slate-100 dark:bg-gray-800 border-none rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            autoFocus
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-gray-300"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Close emoji picker"
        >
          <X size={16} />
        </button>
      </div>

      {/* Category Tab Bar (hidden when searching) */}
      {!search && (
        <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-900/50 overflow-x-auto no-scrollbar">
          {EMOJI_CATEGORIES.map(cat => {
            const Icon = cat.icon
            const isActive = activeCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                title={cat.name}
                className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                  isActive
                    ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800'
                }`}
              >
                <Icon size={16} />
              </button>
            )
          })}
        </div>
      )}

      {/* Emoji Grid */}
      <div className="flex-1 overflow-y-auto p-3.5 custom-scrollbar">
        {filteredEmojis.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-10 text-slate-400 dark:text-gray-500">
            <span className="text-3xl mb-1">🔍</span>
            <p className="text-xs">No matching emojis found</p>
          </div>
        ) : (
          <div className="grid grid-cols-7 sm:grid-cols-8 gap-1.5">
            {filteredEmojis.map((e, idx) => (
              <button
                key={`${e.char}-${idx}`}
                onClick={() => onSelect(e.char)}
                title={e.keywords.join(', ')}
                className="w-9 h-9 sm:w-9.5 sm:h-9.5 flex items-center justify-center text-xl sm:text-2xl rounded-xl hover:bg-slate-100 dark:hover:bg-gray-800 hover:scale-115 active:scale-95 transition-transform duration-100 select-none"
              >
                {e.char}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer Status */}
      <div className="px-3.5 py-1.5 border-t border-slate-100 dark:border-gray-800 bg-slate-50/60 dark:bg-gray-900/60 flex items-center justify-between text-[11px] text-slate-400 dark:text-gray-500">
        <span>{search ? `${filteredEmojis.length} results` : EMOJI_CATEGORIES.find(c => c.id === activeCategory)?.name}</span>
        <span className="text-[10px] text-slate-300 dark:text-gray-600">Click to insert</span>
      </div>
    </motion.div>
  )
}
