const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

/**
 * Fungsi untuk menampilkan form input informasi
 * @param {Interaction} interaction - Interaksi Discord
 */
async function showInformasiForm(interaction) {
    try {
        const modal = new ModalBuilder()
            .setCustomId('informasi_modal')
            .setTitle('Buat Informasi Baru');
        
        const judulInput = new TextInputBuilder()
            .setCustomId('judul_informasi')
            .setLabel('Judul Informasi')
            .setPlaceholder('Masukkan judul informasi yang menarik')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(100);
        
        const channelInput = new TextInputBuilder()
            .setCustomId('channel_id')
            .setLabel('ID Channel Tujuan')
            .setPlaceholder('Masukkan ID channel tujuan atau kosongkan untuk channel saat ini')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);
        
        const penjelasanInput = new TextInputBuilder()
            .setCustomId('penjelasan')
            .setLabel('Isi Informasi')
            .setPlaceholder('Masukkan isi informasi yang ingin disampaikan')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(4000);
        
        const styleInput = new TextInputBuilder()
            .setCustomId('style')
            .setLabel('Style Teks (1-6)')
            .setPlaceholder('Pilih style 1-6: 1=Modern, 2=Elegant, 3=Neon, 4=Gradient, 5=Minimalist, 6=Futuristic')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);
        
        const imageInput = new TextInputBuilder()
            .setCustomId('image_url')
            .setLabel('URL Gambar (Opsional)')
            .setPlaceholder('Masukkan URL gambar untuk ditampilkan di informasi')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);
        
        const firstActionRow = new ActionRowBuilder().addComponents(judulInput);
        const secondActionRow = new ActionRowBuilder().addComponents(channelInput);
        const thirdActionRow = new ActionRowBuilder().addComponents(penjelasanInput);
        const fourthActionRow = new ActionRowBuilder().addComponents(styleInput);
        const fifthActionRow = new ActionRowBuilder().addComponents(imageInput);
        
        modal.addComponents(firstActionRow, secondActionRow, thirdActionRow, fourthActionRow, fifthActionRow);
        
        await interaction.showModal(modal);
    } catch (error) {
        console.error('Error saat menampilkan form informasi:', error);
        await interaction.reply({
            content: '❌ Terjadi kesalahan saat menampilkan form informasi. Silakan coba lagi.',
            ephemeral: true
        }).catch(() => {});
    }
}

/**
 * Fungsi untuk memproses form informasi
 * @param {Interaction} interaction - Interaksi Discord
 */
async function processInformasiForm(interaction) {
    try {
        // Mendapatkan nilai dari form
        const judul = interaction.fields.getTextInputValue('judul_informasi');
        const channelId = interaction.fields.getTextInputValue('channel_id') || interaction.channelId;
        const penjelasan = interaction.fields.getTextInputValue('penjelasan');
        const style = interaction.fields.getTextInputValue('style') || '1';
        const imageUrl = interaction.fields.getTextInputValue('image_url');
        
        // Mendapatkan channel tujuan
        const targetChannel = await interaction.client.channels.fetch(channelId).catch(() => null);
        if (!targetChannel) {
            return await interaction.reply({
                content: `❌ Channel dengan ID ${channelId} tidak ditemukan! Pastikan ID channel valid.`,
                ephemeral: true
            });
        }
        
        // Membuat informasi dengan style yang dipilih
        const informasi = await createStyledInformasi(judul, penjelasan, style, imageUrl, interaction.user);
        
        // Mengirim informasi ke channel tujuan
        await targetChannel.send(informasi);
        
        // Konfirmasi kepada admin
        await interaction.reply({
            content: `✅ Informasi berhasil dikirim ke channel ${targetChannel.name}!`,
            ephemeral: true
        });
    } catch (error) {
        console.error('Error saat memproses form informasi:', error);
        await interaction.reply({
            content: '❌ Terjadi kesalahan saat memproses informasi. Silakan coba lagi.',
            ephemeral: true
        }).catch(() => {});
    }
}

/**
 * Fungsi untuk membuat informasi dengan style yang dipilih
 * @param {String} judul - Judul informasi
 * @param {String} penjelasan - Isi informasi
 * @param {String} style - Style teks (1-6)
 * @param {String} imageUrl - URL gambar (opsional)
 * @param {User} author - Pengirim informasi
 * @returns {Object} - Objek pesan dengan embed dan komponen
 */
async function createStyledInformasi(judul, penjelasan, style, imageUrl, author) {
    // Mengolah penjelasan berdasarkan style
    let styledTitle = '';
    let styledDescription = '';
    let embedColor = '';
    let embedStyle = {};
    
    // Menentukan style berdasarkan input
    switch (style) {
        case '1': // Modern
            styledTitle = `📱 ${judul.toUpperCase()} 📱`;
            styledDescription = formatModernText(penjelasan);
            embedColor = '#3498db';
            embedStyle = {
                author: { name: `${author.username} • Modern Style`, iconURL: author.displayAvatarURL() },
                footer: { text: '• Informasi Modern • Diperbarui', iconURL: 'https://i.imgur.com/wSTFkRM.png' }
            };
            break;
        case '2': // Elegant
            styledTitle = `✨ ${judul} ✨`;
            styledDescription = formatElegantText(penjelasan);
            embedColor = '#9b59b6';
            embedStyle = {
                author: { name: `${author.username} • Elegant Style`, iconURL: author.displayAvatarURL() },
                footer: { text: '• Informasi Elegan • Diperbarui', iconURL: 'https://i.imgur.com/wSTFkRM.png' }
            };
            break;
        case '3': // Neon
            styledTitle = `⚡ ${judul} ⚡`;
            styledDescription = formatNeonText(penjelasan);
            embedColor = '#e74c3c';
            embedStyle = {
                author: { name: `${author.username} • Neon Style`, iconURL: author.displayAvatarURL() },
                footer: { text: '• Informasi Neon • Diperbarui', iconURL: 'https://i.imgur.com/wSTFkRM.png' }
            };
            break;
        case '4': // Gradient
            styledTitle = `🌈 ${judul} 🌈`;
            styledDescription = formatGradientText(penjelasan);
            embedColor = '#2ecc71';
            embedStyle = {
                author: { name: `${author.username} • Gradient Style`, iconURL: author.displayAvatarURL() },
                footer: { text: '• Informasi Gradient • Diperbarui', iconURL: 'https://i.imgur.com/wSTFkRM.png' }
            };
            break;
        case '5': // Minimalist
            styledTitle = `${judul}`;
            styledDescription = formatMinimalistText(penjelasan);
            embedColor = '#f1c40f';
            embedStyle = {
                author: { name: `${author.username} • Minimalist Style`, iconURL: author.displayAvatarURL() },
                footer: { text: '• Informasi Minimalis • Diperbarui', iconURL: 'https://i.imgur.com/wSTFkRM.png' }
            };
            break;
        case '6': // Futuristic
            styledTitle = `🔮 ${judul} 🔮`;
            styledDescription = formatFuturisticText(penjelasan);
            embedColor = '#1abc9c';
            embedStyle = {
                author: { name: `${author.username} • Futuristic Style`, iconURL: author.displayAvatarURL() },
                footer: { text: '• Informasi Futuristik • Diperbarui', iconURL: 'https://i.imgur.com/wSTFkRM.png' }
            };
            break;
        default: // Default Modern
            styledTitle = `📱 ${judul.toUpperCase()} 📱`;
            styledDescription = formatModernText(penjelasan);
            embedColor = '#3498db';
            embedStyle = {
                author: { name: `${author.username} • Modern Style`, iconURL: author.displayAvatarURL() },
                footer: { text: '• Informasi Modern • Diperbarui', iconURL: 'https://i.imgur.com/wSTFkRM.png' }
            };
    }
    
    // Membuat embed untuk informasi
    const informasiEmbed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle(styledTitle)
        .setDescription(styledDescription)
        .setAuthor(embedStyle.author)
        .setFooter(embedStyle.footer)
        .setTimestamp();
    
    // Menambahkan gambar jika ada
    if (imageUrl) {
        informasiEmbed.setImage(imageUrl);
    }
    
    // Membuat tombol share untuk informasi
    const shareButton = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setLabel('Share')
                .setStyle(ButtonStyle.Link)
                .setURL(`https://discord.com/channels/${author.guild?.id || '@me'}/${author.channelId}`)
                .setEmoji('🔗')
        );
    
    // Mengembalikan objek pesan
    return {
        embeds: [informasiEmbed],
        components: [shareButton]
    };
}

/**
 * Format teks dengan style Modern
 * @param {String} text - Teks yang akan diformat
 * @returns {String} - Teks yang sudah diformat
 */
function formatModernText(text) {
    // Split paragraf
    const paragraphs = text.split('\n\n');
    
    // Format setiap paragraf
    const formattedParagraphs = paragraphs.map((paragraph, index) => {
        // Tambahkan emoji untuk setiap paragraf
        const emoji = getEmojiForIndex(index);
        
        // Format paragraf dengan bullet point dan highlight kata penting
        return `${emoji} **${paragraph.split(' ')[0]}** ${paragraph.substring(paragraph.indexOf(' ') + 1)}`;
    });
    
    // Gabungkan paragraf dengan separator yang menarik
    return formattedParagraphs.join('\n\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n');
}

/**
 * Format teks dengan style Elegant
 * @param {String} text - Teks yang akan diformat
 * @returns {String} - Teks yang sudah diformat
 */
function formatElegantText(text) {
    // Split paragraf
    const paragraphs = text.split('\n\n');
    
    // Format setiap paragraf
    const formattedParagraphs = paragraphs.map((paragraph) => {
        // Format paragraf dengan italic dan highlight kata penting
        return `*${paragraph.split(' ')[0]}* ${paragraph.substring(paragraph.indexOf(' ') + 1)}`;
    });
    
    // Gabungkan paragraf dengan separator yang elegan
    return `> ${formattedParagraphs.join('\n>\n> ')}`;
}

/**
 * Format teks dengan style Neon
 * @param {String} text - Teks yang akan diformat
 * @returns {String} - Teks yang sudah diformat
 */
function formatNeonText(text) {
    // Split paragraf
    const paragraphs = text.split('\n\n');
    
    // Format setiap paragraf
    const formattedParagraphs = paragraphs.map((paragraph, index) => {
        // Tambahkan emoji untuk setiap paragraf
        const emoji = getEmojiForIndex(index + 5); // Offset untuk mendapatkan emoji yang berbeda
        
        // Format paragraf dengan bold dan highlight kata penting
        return `${emoji} **${paragraph.split(' ')[0].toUpperCase()}** ${paragraph.substring(paragraph.indexOf(' ') + 1)}`;
    });
    
    // Gabungkan paragraf dengan separator yang neon
    return formattedParagraphs.join('\n\n⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡\n\n');
}

/**
 * Format teks dengan style Gradient
 * @param {String} text - Teks yang akan diformat
 * @returns {String} - Teks yang sudah diformat
 */
function formatGradientText(text) {
    // Split paragraf
    const paragraphs = text.split('\n\n');
    
    // Format setiap paragraf
    const formattedParagraphs = paragraphs.map((paragraph, index) => {
        // Format paragraf dengan quote block
        return `> 🔹 **${paragraph.split(' ')[0]}**\n> ${paragraph.substring(paragraph.indexOf(' ') + 1)}`;
    });
    
    // Gabungkan paragraf
    return formattedParagraphs.join('\n\n');
}

/**
 * Format teks dengan style Minimalist
 * @param {String} text - Teks yang akan diformat
 * @returns {String} - Teks yang sudah diformat
 */
function formatMinimalistText(text) {
    // Split paragraf
    const paragraphs = text.split('\n\n');
    
    // Format setiap paragraf
    const formattedParagraphs = paragraphs.map((paragraph) => {
        // Format paragraf dengan minimalis
        return `• ${paragraph}`;
    });
    
    // Gabungkan paragraf
    return formattedParagraphs.join('\n\n');
}

/**
 * Format teks dengan style Futuristic
 * @param {String} text - Teks yang akan diformat
 * @returns {String} - Teks yang sudah diformat
 */
function formatFuturisticText(text) {
    // Split paragraf
    const paragraphs = text.split('\n\n');
    
    // Format setiap paragraf
    const formattedParagraphs = paragraphs.map((paragraph, index) => {
        // Format paragraf dengan code block untuk beberapa paragraf
        if (index % 2 === 0) {
            return `\`\`\`fix\n${paragraph}\n\`\`\``;
        } else {
            return `**${paragraph}**`;
        }
    });
    
    // Gabungkan paragraf
    return formattedParagraphs.join('\n\n');
}

/**
 * Mendapatkan emoji berdasarkan index
 * @param {Number} index - Index paragraf
 * @returns {String} - Emoji yang sesuai
 */
function getEmojiForIndex(index) {
    const emojis = ['📌', '🔍', '📊', '📱', '💡', '🔔', '📢', '🎯', '🚀', '✨'];
    return emojis[index % emojis.length];
}

module.exports = {
    showInformasiForm,
    processInformasiForm
}; 