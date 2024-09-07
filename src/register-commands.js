require('dotenv').config();
const { REST, Routes, Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const commands = [
  {
    name: 'wiki',
    description: 'Search Wikipedia for a topic',
    options: [
      {
        name: 'query',
        description: 'The topic you want to search on Wikipedia',
        type: 3, 
        required: true,
      },
    ],
  },
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('Registering slash commands...');

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    console.log('Slash commands were registered successfully!');
  } catch (error) {
    console.log(`There was an error registering commands: ${error}`);
  }
})();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName, options } = interaction;

  if (commandName === 'wiki') {
    const query = options.getString('query');
    await interaction.deferReply();

    try {
      const response = await axios.get(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`
      );

      const { extract } = response.data;

      if (!extract) {
        throw new Error('No extract found for the given query.');
      }

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'Summarize the following text.' },
          { role: 'user', content: extract },
        ],
      });

      const summary = completion.data.choices[0].message.content;

      await interaction.editReply({ content: `**Summary:**\n${summary}` });
    } catch (error) {
      console.error(`Error fetching Wikipedia data or summarizing: ${error}`);
      await interaction.editReply('Could not find anything on Wikipedia or summarize it.');
    }
  }
});



client.login(process.env.TOKEN);
