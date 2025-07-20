const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

/**
 * Fungsi untuk membuat tombol testimoni
 * @returns {ActionRowBuilder} Row dengan tombol testimoni
 */
function createTestimoniButton() {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('testimoni_button')
                .setLabel('Berikan Testimoni')
                .setStyle(ButtonStyle.Success)
                .setEmoji('⭐')
        );
    
    return row;
}

/**
 * Fungsi untuk menampilkan form testimoni
 * @param {Interaction} interaction - Interaksi Discord
 * @param {String} productName - Nama produk
 * @param {String} price - Harga produk
 * @param {String} transactionId - ID transaksi
 */
async function showTestimoniForm(interaction, productName, price, transactionId) {
    try {
        const modal = new ModalBuilder()
            .setCustomId(`testimoni_modal_${productName}_${price}_${transactionId}`)
            .setTitle('Berikan Testimoni Anda');
        
        const ratingInput = new TextInputBuilder()
            .setCustomId('rating')
            .setLabel('Rating (1-5 Bintang)')
            .setPlaceholder('Masukkan rating 1-5')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(1);
        
        const reviewInput = new TextInputBuilder()
            .setCustomId('review')
            .setLabel('Ulasan')
            .setPlaceholder('Bagaimana pengalaman Anda menggunakan produk kami?')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(500);
        
        const imageUrlInput = new TextInputBuilder()
            .setCustomId('image_url')
            .setLabel('URL Gambar (Screenshot)')
            .setPlaceholder('Masukkan URL gambar screenshot produk (opsional)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);
        
        const firstActionRow = new ActionRowBuilder().addComponents(ratingInput);
        const secondActionRow = new ActionRowBuilder().addComponents(reviewInput);
        const thirdActionRow = new ActionRowBuilder().addComponents(imageUrlInput);
        
        modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);
        
        await interaction.showModal(modal);
    } catch (error) {
        console.error('Error saat menampilkan form testimoni:', error);
        await interaction.reply({
            content: '❌ Terjadi kesalahan saat menampilkan form testimoni. Silakan coba lagi.',
            ephemeral: true
        }).catch(() => {});
    }
}

/**
 * Fungsi untuk memproses form testimoni
 * @param {Interaction} interaction - Interaksi Discord
 * @param {String} channelId - ID channel untuk testimoni
 */
async function processTestimoniForm(interaction, channelId) {
    try {
        // Mendapatkan nilai dari form
        const rating = interaction.fields.getTextInputValue('rating');
        const review = interaction.fields.getTextInputValue('review');
        const imageUrl = interaction.fields.getTextInputValue('image_url');
        
        // Validasi rating
        const ratingNum = parseInt(rating);
        if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
            return await interaction.reply({
                content: '❌ Rating harus berupa angka antara 1-5.',
                ephemeral: true
            });
        }
        
        // Mendapatkan informasi produk dari customId
        const customIdParts = interaction.customId.split('_');
        const productName = customIdParts[2];
        const price = customIdParts[3];
        const transactionId = customIdParts[4];
        
        // Membuat string bintang berdasarkan rating
        const stars = '⭐'.repeat(ratingNum);
        
        // Membuat embed untuk testimoni dengan style yang menarik
        const testimoniEmbed = await createStyledTestimoni(interaction.user, productName, price, stars, review, imageUrl);
        
        // Mengirim testimoni ke channel
        const channel = await interaction.client.channels.fetch(channelId).catch(() => null);
        if (channel) {
            await channel.send({ embeds: [testimoniEmbed] });
        } else {
            console.error(`Channel testimoni dengan ID ${channelId} tidak ditemukan!`);
        }
        
        // Konfirmasi kepada pengguna
        await interaction.reply({
            content: `✅ Terima kasih atas testimoni Anda! Testimoni Anda telah berhasil dipublikasikan di channel <#${channelId}>.`,
            ephemeral: true
        });
    } catch (error) {
        console.error('Error saat memproses form testimoni:', error);
        await interaction.reply({
            content: '❌ Terjadi kesalahan saat memproses testimoni. Silakan coba lagi.',
            ephemeral: true
        }).catch(() => {});
    }
}

/**
 * Fungsi untuk membuat testimoni dengan style yang menarik
 * @param {User} user - User yang memberikan testimoni
 * @param {String} productName - Nama produk
 * @param {String} price - Harga produk
 * @param {String} stars - String bintang
 * @param {String} review - Ulasan
 * @param {String} imageUrl - URL gambar
 * @returns {EmbedBuilder} - Embed testimoni
 */
async function createStyledTestimoni(user, productName, price, stars, review, imageUrl) {
    // Pilih warna berdasarkan jumlah bintang
    let color;
    switch (stars.length) {
        case 5: color = '#FFD700'; break; // Gold
        case 4: color = '#00FF00'; break; // Green
        case 3: color = '#00BFFF'; break; // Blue
        case 2: color = '#FFA500'; break; // Orange
        case 1: color = '#FF0000'; break; // Red
        default: color = '#FFFFFF'; // White
    }
    
    // Format review dengan emoji dan formatting
    const formattedReview = formatReview(review);
    
    // Membuat embed testimoni
    const testimoniEmbed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`📝 Testimoni Produk: ${productName}`)
        .setDescription(`${stars} | ${stars.length}/5`)
        .addFields(
            { name: '👤 Customer', value: `${user.tag} (<@${user.id}>)`, inline: true },
            { name: '💰 Harga', value: `Rp ${price}`, inline: true },
            { name: '📅 Tanggal', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
            { name: '💬 Ulasan', value: formattedReview, inline: false }
        )
        .setFooter({ text: `Terima kasih atas testimoni Anda! • ${new Date().toLocaleDateString()}` })
        .setTimestamp();
    
    // Tambahkan thumbnail avatar pengguna
    testimoniEmbed.setThumbnail(user.displayAvatarURL({ dynamic: true }));
    
    // Tambahkan gambar jika ada
    if (imageUrl) {
        testimoniEmbed.setImage(imageUrl);
    }
    
    return testimoniEmbed;
}

/**
 * Fungsi untuk memformat review dengan emoji dan formatting
 * @param {String} review - Ulasan asli
 * @returns {String} - Ulasan yang sudah diformat
 */
function formatReview(review) {
    // Split paragraf
    const paragraphs = review.split('\n');
    
    // Format setiap paragraf
    const formattedParagraphs = paragraphs.map((paragraph, index) => {
        // Tambahkan emoji untuk setiap paragraf
        const emoji = getReviewEmoji(index);
        
        // Format paragraf dengan quote block
        return `${emoji} ${paragraph}`;
    });
    
    // Gabungkan paragraf
    return formattedParagraphs.join('\n\n');
}

/**
 * Fungsi untuk mendapatkan emoji untuk review
 * @param {Number} index - Index paragraf
 * @returns {String} - Emoji
 */
function getReviewEmoji(index) {
    const emojis = ['💯', '👍', '🔥', '💫', '✨', '🌟', '💎', '🎯', '🚀', '💪'];
    return emojis[index % emojis.length];
}

module.exports = {
    createTestimoniButton,
    showTestimoniForm,
    processTestimoniForm
}; 