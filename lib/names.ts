const adjectives = [
  "Suspicious", "Angry", "Sleepy", "Neon", "Disco", "Cosmic", "Clever",
  "Wary", "Electric", "Curious", "Brave", "Mighty", "Velvet", "Turbo",
];

const animals = [
  "Potato", "Goose", "Ferret", "Pickle", "Llama", "Beaver", "Badger",
  "Otter", "Pigeon", "Mongoose", "Capybara", "Raccoon", "Penguin", "Yak",
];

export function randomNickname() {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  return `${adjective} ${animal}`;
}

