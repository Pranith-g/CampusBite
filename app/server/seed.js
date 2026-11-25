// Demo data. Everything here is invented for the demo: the prices, the people
// and the USNs. Never put a real student's USN in this file.

export const MENU = [
  // name, section, price in rupees, preparation time in minutes, photo file,
  // one line about the dish
  ['Masala dosa', 'Meals', 45, 6, 'masala-dosa',
    'Crisp rice crepe with potato masala, sambar and chutney'],
  ['Idli vada', 'Meals', 35, 3, 'idli-vada',
    'Two soft idlis and a crisp medu vada with sambar'],
  ['Veg thali', 'Meals', 70, 4, 'veg-thali',
    'Rice, chapati, dal, two sabzis, curd and papad'],
  ['Chole bhature', 'Meals', 60, 7, 'chole-bhature',
    'Two fluffy bhature with spicy chickpea curry'],
  ['Veg biryani', 'Meals', 80, 5, 'veg-biryani',
    'Rice cooked with vegetables and whole spices, with raita'],
  ['Samosa (2)', 'Snacks', 20, 2, 'samosa',
    'Crisp pastry with spiced potato filling, with chutney'],
  ['Vada pav', 'Snacks', 25, 2, 'vada-pav',
    'Spiced potato vada in a soft pav with garlic chutney'],
  ['Gobi manchurian', 'Snacks', 50, 6, 'gobi-manchurian',
    'Crispy cauliflower tossed in a tangy Indo-Chinese sauce'],
  ['Paneer roll', 'Snacks', 55, 5, 'paneer-roll',
    'Paneer, onion and mint chutney rolled in a soft roti'],
  ['Bhel puri', 'Snacks', 30, 3, 'bhel-puri',
    'Puffed rice, sev, onion and tangy chutneys'],
  ['Filter coffee', 'Drinks', 15, 1, 'filter-coffee',
    'Strong South Indian coffee with frothy milk'],
  ['Masala chai', 'Drinks', 12, 1, 'masala-chai',
    'Milky tea brewed with ginger and cardamom'],
  ['Fresh lime soda', 'Drinks', 30, 2, 'lime-soda',
    'Fizzy lime soda, sweet or salted'],
  ['Mango lassi', 'Drinks', 40, 2, 'mango-lassi',
    'Thick chilled yoghurt drink with mango pulp'],
  ['Badam milk', 'Drinks', 35, 1, 'badam-milk',
    'Warm milk with almonds and saffron'],
];

// Every dish starts with this many. The owner changes it on the Stock screen.
export const START_QTY = 60;

// Demo student accounts. The PINs only work on this demo app.
export const STUDENTS = [
  { usn: '1DS24CS017', name: 'Ananya Rao', pin: '2468' },
  { usn: '1DS24IS042', name: 'Rohan Shetty', pin: '1357' },
  { usn: '1DS24EC008', name: 'Meghana K', pin: '8642' },
];

// Demo canteen owner account. Change this before real use.
export const OWNER = { username: 'canteen', name: 'Canteen owner', password: 'dosa-counter' };

// "Add sample orders" on the owner screen fills the kitchen for a demo.
export const SAMPLE_USN = 'SAMPLE';
export const SAMPLE_NAMES = ['Aisha', 'Vikram', 'Neha', 'Arjun', 'Divya', 'Karthik', 'Sana', 'Rahul', 'Pooja', 'Imran'];
