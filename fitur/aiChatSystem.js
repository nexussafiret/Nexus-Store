const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

// Database untuk menyimpan conversation history
const conversations = new Map();
const aiSettings = new Map();

/**
 * Sistem AI Chat Assistant yang canggih
 * @module aiChatSystem
 */

// Konfigurasi AI models yang tersedia
const AI_MODELS = {
    GPT: {
        name: 'GPT-4',
        description: 'Model terbaru dari OpenAI, sangat baik untuk berbagai tugas',
        emoji: '🧠',
        maxTokens: 4000,
        temperature: 0.7
    },
    CLAUDE: {
        name: 'Claude 3',
        description: 'AI dari Anthropic yang sangat baik dalam analisis dan penalaran',
        emoji: '🎭',
        maxTokens: 3000,
        temperature: 0.6
    },
    GEMINI: {
        name: 'Gemini Pro',
        description: 'AI dari Google yang excellent untuk berbagai bahasa dan konteks',
        emoji: '💎',
        maxTokens: 2000,
        temperature: 0.8
    },
    LLAMA: {
        name: 'LLaMA 2',
        description: 'Open source model yang powerful dan efisien',
        emoji: '🦙',
        maxTokens: 2000,
        temperature: 0.7
    }
};

// Personality presets untuk AI
const PERSONALITIES = {
    FRIENDLY: {
        name: 'Friendly Assistant',
        prompt: 'Kamu adalah asisten yang ramah dan membantu. Selalu bersikap positif dan supportif.',
        emoji: '😊'
    },
    PROFESSIONAL: {
        name: 'Professional Expert',
        prompt: 'Kamu adalah expert profesional yang memberikan jawaban detail dan akurat.',
        emoji: '👔'
    },
    CREATIVE: {
        name: 'Creative Genius',
        prompt: 'Kamu adalah AI kreatif yang suka berpikir out-of-the-box dan memberikan ide-ide inovatif.',
        emoji: '🎨'
    },
    TECHNICAL: {
        name: 'Technical Specialist',
        prompt: 'Kamu adalah specialist teknis yang fokus pada solusi programming dan teknologi.',
        emoji: '💻'
    },
    CASUAL: {
        name: 'Casual Friend',
        prompt: 'Kamu adalah teman casual yang suka ngobrol santai dengan gaya bahasa gaul.',
        emoji: '🤙'
    }
};

/**
 * Setup sistem AI Chat
 * @param {String} guildId - ID server
 * @param {Object} settings - Pengaturan AI
 */
function setupAIChat(guildId, settings = {}) {
    aiSettings.set(guildId, {
        enabled: true,
        defaultModel: 'GEMINI',
        defaultPersonality: 'FRIENDLY',
        maxHistoryLength: 10,
        autoTranslate: false,
        allowImageAnalysis: true,
        rateLimitPerUser: 20, // per hour
        ...settings
    });
    console.log(`AI Chat system setup untuk guild ${guildId}`);
}

/**
 * Mendapatkan atau membuat conversation history untuk user
 * @param {String} userId - ID user
 * @param {String} guildId - ID server
 * @returns {Object} - Conversation data
 */
function getConversation(userId, guildId) {
    const key = `${guildId}_${userId}`;
    
    if (!conversations.has(key)) {
        conversations.set(key, {
            userId: userId,
            guildId: guildId,
            messages: [],
            currentModel: aiSettings.get(guildId)?.defaultModel || 'GEMINI',
            personality: aiSettings.get(guildId)?.defaultPersonality || 'FRIENDLY',
            createdAt: new Date(),
            lastActivity: new Date(),
            totalMessages: 0,
            favoriteTopics: []
        });
    }
    
    return conversations.get(key);
}

/**
 * Menambah pesan ke conversation history
 * @param {String} userId - ID user
 * @param {String} guildId - ID server
 * @param {String} role - Role (user/assistant)
 * @param {String} content - Isi pesan
 */
function addToConversation(userId, guildId, role, content) {
    const conversation = getConversation(userId, guildId);
    const settings = aiSettings.get(guildId);
    
    conversation.messages.push({
        role: role,
        content: content,
        timestamp: new Date()
    });
    
    // Batasi panjang history
    if (conversation.messages.length > settings.maxHistoryLength * 2) {
        conversation.messages = conversation.messages.slice(-settings.maxHistoryLength * 2);
    }
    
    conversation.lastActivity = new Date();
    if (role === 'user') {
        conversation.totalMessages++;
    }
    
    conversations.set(`${guildId}_${userId}`, conversation);
}

/**
 * Generate respons AI (simulasi - dalam implementasi nyata gunakan API AI)
 * @param {Object} conversation - Data conversation
 * @param {String} userMessage - Pesan user
 * @returns {String} - Respons AI
 */
async function generateAIResponse(conversation, userMessage) {
    // Simulasi API call ke AI service
    // Dalam implementasi nyata, ini akan memanggil API OpenAI, Claude, dll.
    
    const model = AI_MODELS[conversation.currentModel];
    const personality = PERSONALITIES[conversation.personality];
    
    // Simulasi delay API
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Contoh respons berdasarkan personality
    const responses = {
        FRIENDLY: [
            "Hai! Aku senang bisa membantu kamu 😊 Tentang pertanyaan kamu...",
            "Wah, pertanyaan yang menarik! Mari kita bahas bersama...",
            "Aku akan coba bantu kamu dengan sebaik-baiknya! 🌟"
        ],
        PROFESSIONAL: [
            "Berdasarkan analisis saya, berikut adalah penjelasan yang komprehensif...",
            "Untuk menjawab pertanyaan Anda secara akurat...",
            "Saya akan memberikan informasi yang detail dan terstruktur..."
        ],
        CREATIVE: [
            "Hmm, ini ide yang kreatif! Bagaimana kalau kita explore dari angle yang berbeda? 🎨",
            "Wah, ini bisa jadi starting point untuk sesuatu yang amazing!",
            "Let me think outside the box untuk ini... ✨"
        ],
        TECHNICAL: [
            "Dari sisi teknis, ini bisa kita approach dengan beberapa cara...",
            "Mari kita breakdown masalah ini step by step...",
            "Berdasarkan best practices, saya recommend..."
        ],
        CASUAL: [
            "Yo! Santai aja, aku bantuin kamu 🤙",
            "Gampang sih ini mah, cek aja penjelasan aku...",
            "Oke bro, ini dia jawabannya..."
        ]
    };
    
    const personalityResponses = responses[conversation.personality] || responses.FRIENDLY;
    const baseResponse = personalityResponses[Math.floor(Math.random() * personalityResponses.length)];
    
    // Simulasi respons yang lebih intelligent berdasarkan input
    let intelligentResponse = "";
    
    if (userMessage.toLowerCase().includes('hello') || userMessage.toLowerCase().includes('hai')) {
        intelligentResponse = "Halo! Ada yang bisa aku bantu hari ini?";
    } else if (userMessage.toLowerCase().includes('code') || userMessage.toLowerCase().includes('programming')) {
        intelligentResponse = "Untuk masalah programming, aku bisa bantu dengan berbagai bahasa seperti JavaScript, Python, Java, dll. Apa yang spesifik kamu butuhkan?";
    } else if (userMessage.toLowerCase().includes('design') || userMessage.toLowerCase().includes('ui')) {
        intelligentResponse = "Untuk design dan UI, aku bisa kasih saran tentang best practices, color theory, typography, dan user experience. Mau bahas yang mana?";
    } else if (userMessage.toLowerCase().includes('help') || userMessage.toLowerCase().includes('bantuan')) {
        intelligentResponse = "Tentu! Aku bisa membantu dengan berbagai topik seperti teknologi, programming, design, bisnis, atau bahkan just casual chat. Mau ngobrolin apa?";
    } else {
        intelligentResponse = `Tentang "${userMessage.substring(0, 50)}${userMessage.length > 50 ? '...' : ''}", ini perspektif aku: [Respons akan disesuaikan dengan konteks dan personality yang dipilih]`;
    }
    
    return `${baseResponse}\n\n${intelligentResponse}\n\n*Powered by ${model.name} ${model.emoji}*`;
}

/**
 * Setup sistem AI Chat di channel
 * @param {Client} client - Discord client
 * @param {String} channelId - ID channel
 */
async function setupAIChatSystem(client, channelId) {
    try {
        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (!channel) {
            console.error(`Channel dengan ID ${channelId} tidak ditemukan!`);
            return;
        }
        
        const aiChatEmbed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('🤖 Nexus AI Chat Assistant')
            .setDescription('Chat dengan AI yang cerdas dan dapat membantu berbagai kebutuhan Anda!')
            .addFields(
                { name: '🧠 AI Models Available', value: '• GPT-4 - Terbaru dari OpenAI\n• Claude 3 - AI dari Anthropic\n• Gemini Pro - Google AI\n• LLaMA 2 - Open source powerful', inline: false },
                { name: '🎭 Personality Options', value: '• Friendly Assistant 😊\n• Professional Expert 👔\n• Creative Genius 🎨\n• Technical Specialist 💻\n• Casual Friend 🤙', inline: false },
                { name: '✨ Features', value: '• Conversation memory\n• Multi-language support\n• Image analysis\n• Code assistance\n• Creative writing help', inline: false }
            )
            .setImage('https://i.imgur.com/ai-chat-banner.png')
            .setFooter({ text: 'Nexus AI Chat • Powered by multiple AI models!' })
            .setTimestamp();
        
        const aiChatButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('start_ai_chat')
                    .setLabel('Start Chat')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💬'),
                new ButtonBuilder()
                    .setCustomId('ai_settings')
                    .setLabel('Settings')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⚙️'),
                new ButtonBuilder()
                    .setCustomId('ai_models')
                    .setLabel('Switch Model')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔄')
            );
        
        const secondRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('ai_personality')
                    .setLabel('Change Personality')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🎭'),
                new ButtonBuilder()
                    .setCustomId('ai_history')
                    .setLabel('Chat History')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📚')
            );
        
        await channel.send({
            embeds: [aiChatEmbed],
            components: [aiChatButtons, secondRow]
        });
        
        console.log(`Sistem AI Chat berhasil diatur di channel ${channel.name}`);
    } catch (error) {
        console.error('Error saat mengatur sistem AI Chat:', error);
    }
}

/**
 * Memproses chat dengan AI
 * @param {Interaction} interaction - Discord interaction
 * @param {String} userMessage - Pesan dari user
 */
async function processAIChat(interaction, userMessage) {
    try {
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;
        
        // Defer reply karena AI response bisa lama
        await interaction.deferReply();
        
        // Cek rate limit (implementasi sederhana)
        const conversation = getConversation(userId, guildId);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentMessages = conversation.messages.filter(msg => 
            msg.role === 'user' && msg.timestamp > oneHourAgo
        ).length;
        
        const settings = aiSettings.get(guildId);
        if (recentMessages >= settings.rateLimitPerUser) {
            await interaction.editReply({
                content: '⏰ Anda telah mencapai batas maksimal chat per jam. Silakan coba lagi nanti.',
                ephemeral: true
            });
            return;
        }
        
        // Tambahkan pesan user ke history
        addToConversation(userId, guildId, 'user', userMessage);
        
        // Generate AI response
        const aiResponse = await generateAIResponse(conversation, userMessage);
        
        // Tambahkan respons AI ke history
        addToConversation(userId, guildId, 'assistant', aiResponse);
        
        // Update conversation
        const updatedConversation = getConversation(userId, guildId);
        const currentModel = AI_MODELS[updatedConversation.currentModel];
        const currentPersonality = PERSONALITIES[updatedConversation.personality];
        
        const responseEmbed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setAuthor({
                name: `${currentModel.name} ${currentModel.emoji} • ${currentPersonality.name} ${currentPersonality.emoji}`,
                iconURL: interaction.client.user.displayAvatarURL()
            })
            .setDescription(aiResponse)
            .setFooter({ 
                text: `Chat #${updatedConversation.totalMessages} • ${updatedConversation.messages.length} messages in history` 
            })
            .setTimestamp();
        
        const chatButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('continue_ai_chat')
                    .setLabel('Continue Chat')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💬'),
                new ButtonBuilder()
                    .setCustomId('clear_ai_history')
                    .setLabel('Clear History')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🗑️')
            );
        
        await interaction.editReply({
            embeds: [responseEmbed],
            components: [chatButtons]
        });
        
    } catch (error) {
        console.error('Error processing AI chat:', error);
        await interaction.editReply({
            content: '❌ Terjadi kesalahan saat memproses chat dengan AI. Silakan coba lagi.',
            ephemeral: true
        });
    }
}

/**
 * Menampilkan pilihan AI models
 * @param {Interaction} interaction - Discord interaction
 */
async function showAIModels(interaction) {
    try {
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;
        const conversation = getConversation(userId, guildId);
        
        const modelList = Object.entries(AI_MODELS)
            .map(([key, model]) => {
                const current = key === conversation.currentModel ? '✅' : '⚪';
                return `${current} ${model.emoji} **${model.name}**\n   ${model.description}`;
            })
            .join('\n\n');
        
        const embed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('🧠 Available AI Models')
            .setDescription(`**Current Model: ${AI_MODELS[conversation.currentModel].name}**\n\n${modelList}`)
            .setFooter({ text: 'Pilih model AI yang ingin Anda gunakan' })
            .setTimestamp();
        
        const modelButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('select_gpt')
                    .setLabel('GPT-4')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🧠'),
                new ButtonBuilder()
                    .setCustomId('select_claude')
                    .setLabel('Claude 3')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎭'),
                new ButtonBuilder()
                    .setCustomId('select_gemini')
                    .setLabel('Gemini Pro')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('💎')
            );
        
        await interaction.reply({ embeds: [embed], components: [modelButtons], ephemeral: true });
    } catch (error) {
        console.error('Error showing AI models:', error);
        await interaction.reply({
            content: '❌ Terjadi kesalahan saat menampilkan AI models.',
            ephemeral: true
        });
    }
}

/**
 * Menampilkan chat history user
 * @param {Interaction} interaction - Discord interaction
 */
async function showChatHistory(interaction) {
    try {
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;
        const conversation = getConversation(userId, guildId);
        
        if (conversation.messages.length === 0) {
            await interaction.reply({
                content: '📚 Belum ada riwayat chat. Mulai chat dengan AI terlebih dahulu!',
                ephemeral: true
            });
            return;
        }
        
        const recentMessages = conversation.messages
            .slice(-6) // Ambil 6 pesan terakhir
            .map(msg => {
                const role = msg.role === 'user' ? '👤 You' : '🤖 AI';
                const content = msg.content.length > 100 ? 
                    msg.content.substring(0, 100) + '...' : msg.content;
                return `**${role}**: ${content}`;
            })
            .join('\n\n');
        
        const embed = new EmbedBuilder()
            .setColor('#E74C3C')
            .setTitle('📚 Your Chat History')
            .setDescription(recentMessages)
            .addFields(
                { name: '📊 Statistics', value: `Total Messages: ${conversation.totalMessages}\nHistory Length: ${conversation.messages.length}\nLast Activity: ${conversation.lastActivity.toLocaleString('id-ID')}`, inline: false }
            )
            .setFooter({ text: 'Showing last 3 exchanges' })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
        console.error('Error showing chat history:', error);
        await interaction.reply({
            content: '❌ Terjadi kesalahan saat menampilkan history.',
            ephemeral: true
        });
    }
}

/**
 * Clear chat history user
 * @param {String} userId - ID user
 * @param {String} guildId - ID server
 */
function clearChatHistory(userId, guildId) {
    const key = `${guildId}_${userId}`;
    if (conversations.has(key)) {
        const conversation = conversations.get(key);
        conversation.messages = [];
        conversation.totalMessages = 0;
        conversations.set(key, conversation);
        return true;
    }
    return false;
}

module.exports = {
    setupAIChat,
    setupAIChatSystem,
    processAIChat,
    showAIModels,
    showChatHistory,
    clearChatHistory,
    getConversation,
    addToConversation,
    AI_MODELS,
    PERSONALITIES,
    conversations,
    aiSettings
};