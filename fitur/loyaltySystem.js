const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

// Database sederhana untuk menyimpan poin loyalty (dalam implementasi nyata gunakan database)
const loyaltyData = new Map();
const redeemHistory = new Map();

/**
 * Sistem Loyalty Points untuk customer
 * @module loyaltySystem
 */

// Konfigurasi reward tiers
const LOYALTY_TIERS = {
    BRONZE: { minPoints: 0, multiplier: 1, badge: '🥉', name: 'Bronze Member' },
    SILVER: { minPoints: 100, multiplier: 1.2, badge: '🥈', name: 'Silver Member' },
    GOLD: { minPoints: 300, multiplier: 1.5, badge: '🥇', name: 'Gold Member' },
    PLATINUM: { minPoints: 500, multiplier: 2, badge: '💎', name: 'Platinum Member' },
    DIAMOND: { minPoints: 1000, multiplier: 3, badge: '💠', name: 'Diamond VIP' }
};

// Reward yang bisa ditukar
const REWARDS = {
    DISCOUNT_5: { cost: 50, name: 'Diskon 5%', description: 'Voucher diskon 5% untuk pembelian berikutnya' },
    DISCOUNT_10: { cost: 100, name: 'Diskon 10%', description: 'Voucher diskon 10% untuk pembelian berikutnya' },
    DISCOUNT_15: { cost: 200, name: 'Diskon 15%', description: 'Voucher diskon 15% untuk pembelian berikutnya' },
    FREE_SHIPPING: { cost: 30, name: 'Gratis Ongkir', description: 'Gratis ongkos kirim untuk 1x pembelian' },
    PRIORITY_SUPPORT: { cost: 75, name: 'Priority Support', description: 'Dukungan prioritas selama 7 hari' },
    EXCLUSIVE_PRODUCT: { cost: 300, name: 'Akses Produk Eksklusif', description: 'Akses ke produk member eksklusif' },
    BIRTHDAY_BONUS: { cost: 150, name: 'Birthday Bonus', description: 'Bonus poin di bulan ulang tahun' }
};

/**
 * Menambah poin loyalty untuk user
 * @param {String} userId - ID user
 * @param {Number} points - Jumlah poin yang ditambahkan
 * @param {String} reason - Alasan penambahan poin
 */
function addLoyaltyPoints(userId, points, reason) {
    if (!loyaltyData.has(userId)) {
        loyaltyData.set(userId, {
            totalPoints: 0,
            availablePoints: 0,
            tier: 'BRONZE',
            joinDate: new Date(),
            lastActivity: new Date(),
            transactions: []
        });
    }
    
    const userData = loyaltyData.get(userId);
    const tier = getUserTier(userData.totalPoints);
    const multiplier = LOYALTY_TIERS[tier].multiplier;
    const bonusPoints = Math.floor(points * multiplier);
    
    userData.totalPoints += bonusPoints;
    userData.availablePoints += bonusPoints;
    userData.tier = getUserTier(userData.totalPoints);
    userData.lastActivity = new Date();
    userData.transactions.push({
        type: 'EARN',
        points: bonusPoints,
        reason: reason,
        date: new Date()
    });
    
    loyaltyData.set(userId, userData);
    return bonusPoints;
}

/**
 * Mendapatkan tier user berdasarkan total poin
 * @param {Number} totalPoints - Total poin user
 * @returns {String} - Nama tier
 */
function getUserTier(totalPoints) {
    for (const [tier, config] of Object.entries(LOYALTY_TIERS).reverse()) {
        if (totalPoints >= config.minPoints) {
            return tier;
        }
    }
    return 'BRONZE';
}

/**
 * Setup sistem loyalty di channel
 * @param {Client} client - Discord client
 * @param {String} channelId - ID channel
 */
async function setupLoyaltySystem(client, channelId) {
    try {
        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (!channel) {
            console.error(`Channel dengan ID ${channelId} tidak ditemukan!`);
            return;
        }
        
        const loyaltyEmbed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('⭐ Nexus Loyalty Program')
            .setDescription('Dapatkan poin setiap kali berbelanja dan tukarkan dengan reward menarik!')
            .addFields(
                { name: '🎯 Cara Mendapatkan Poin', value: '• Setiap pembelian = 1 poin per 1000 rupiah\n• Review produk = 10 poin\n• Referral teman = 25 poin\n• Ulang tahun = 50 poin bonus', inline: false },
                { name: '🏆 Member Tiers', value: '🥉 Bronze (0+ poin) - 1x multiplier\n🥈 Silver (100+ poin) - 1.2x multiplier\n🥇 Gold (300+ poin) - 1.5x multiplier\n💎 Platinum (500+ poin) - 2x multiplier\n💠 Diamond VIP (1000+ poin) - 3x multiplier', inline: false },
                { name: '🎁 Contoh Rewards', value: '• Diskon 5% - 50 poin\n• Diskon 10% - 100 poin\n• Gratis Ongkir - 30 poin\n• Priority Support - 75 poin\n• Dan masih banyak lagi!', inline: false }
            )
            .setImage('https://i.imgur.com/loyalty-banner.png')
            .setFooter({ text: 'Nexus Loyalty Program • Semakin sering belanja, semakin banyak untung!' })
            .setTimestamp();
        
        const loyaltyButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('check_loyalty_points')
                    .setLabel('Cek Poin Saya')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⭐'),
                new ButtonBuilder()
                    .setCustomId('loyalty_rewards')
                    .setLabel('Tukar Reward')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🎁'),
                new ButtonBuilder()
                    .setCustomId('loyalty_leaderboard')
                    .setLabel('Leaderboard')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🏆')
            );
        
        await channel.send({
            embeds: [loyaltyEmbed],
            components: [loyaltyButtons]
        });
        
        console.log(`Sistem loyalty berhasil diatur di channel ${channel.name}`);
    } catch (error) {
        console.error('Error saat mengatur sistem loyalty:', error);
    }
}

/**
 * Menampilkan poin loyalty user
 * @param {Interaction} interaction - Discord interaction
 */
async function showUserLoyaltyPoints(interaction) {
    try {
        const userId = interaction.user.id;
        const userData = loyaltyData.get(userId) || {
            totalPoints: 0,
            availablePoints: 0,
            tier: 'BRONZE',
            joinDate: new Date(),
            transactions: []
        };
        
        const tierConfig = LOYALTY_TIERS[userData.tier];
        const nextTier = getNextTier(userData.tier);
        const pointsToNext = nextTier ? LOYALTY_TIERS[nextTier].minPoints - userData.totalPoints : 0;
        
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(`${tierConfig.badge} Status Loyalty Anda`)
            .setAuthor({
                name: interaction.user.username,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .addFields(
                { name: '⭐ Poin Tersedia', value: `${userData.availablePoints} poin`, inline: true },
                { name: '🏆 Total Poin', value: `${userData.totalPoints} poin`, inline: true },
                { name: '👑 Tier Saat Ini', value: `${tierConfig.badge} ${tierConfig.name}`, inline: true },
                { name: '📈 Multiplier', value: `${tierConfig.multiplier}x`, inline: true },
                { name: '🎯 Poin ke Tier Berikutnya', value: nextTier ? `${pointsToNext} poin lagi ke ${LOYALTY_TIERS[nextTier].badge} ${LOYALTY_TIERS[nextTier].name}` : 'Anda sudah di tier tertinggi!', inline: true },
                { name: '📅 Member Sejak', value: userData.joinDate.toLocaleDateString('id-ID'), inline: true }
            )
            .setFooter({ text: 'Nexus Loyalty Program' })
            .setTimestamp();
        
        // Tampilkan 5 transaksi terakhir
        if (userData.transactions.length > 0) {
            const recentTransactions = userData.transactions
                .slice(-5)
                .reverse()
                .map(t => `${t.type === 'EARN' ? '➕' : '➖'} ${t.points} poin - ${t.reason}`)
                .join('\n');
            
            embed.addFields({ name: '📊 Aktivitas Terakhir', value: recentTransactions, inline: false });
        }
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
        console.error('Error menampilkan poin loyalty:', error);
        await interaction.reply({
            content: '❌ Terjadi kesalahan saat mengambil data loyalty Anda.',
            ephemeral: true
        });
    }
}

/**
 * Mendapatkan tier berikutnya
 * @param {String} currentTier - Tier saat ini
 * @returns {String|null} - Tier berikutnya atau null jika sudah tertinggi
 */
function getNextTier(currentTier) {
    const tiers = Object.keys(LOYALTY_TIERS);
    const currentIndex = tiers.indexOf(currentTier);
    return currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;
}

/**
 * Menampilkan daftar reward yang bisa ditukar
 * @param {Interaction} interaction - Discord interaction
 */
async function showRewardShop(interaction) {
    try {
        const userId = interaction.user.id;
        const userData = loyaltyData.get(userId) || { availablePoints: 0 };
        
        const rewardList = Object.entries(REWARDS)
            .map(([key, reward]) => {
                const canAfford = userData.availablePoints >= reward.cost;
                const status = canAfford ? '✅' : '❌';
                return `${status} **${reward.name}** - ${reward.cost} poin\n   ${reward.description}`;
            })
            .join('\n\n');
        
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🎁 Reward Shop')
            .setDescription(`**Poin Anda: ${userData.availablePoints} ⭐**\n\n${rewardList}`)
            .setFooter({ text: 'Klik tombol di bawah untuk menukar reward!' })
            .setTimestamp();
        
        const redeemButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('redeem_reward')
                    .setLabel('Tukar Reward')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🎁')
            );
        
        await interaction.reply({ embeds: [embed], components: [redeemButton], ephemeral: true });
    } catch (error) {
        console.error('Error menampilkan reward shop:', error);
        await interaction.reply({
            content: '❌ Terjadi kesalahan saat menampilkan reward shop.',
            ephemeral: true
        });
    }
}

/**
 * Menampilkan leaderboard loyalty
 * @param {Interaction} interaction - Discord interaction
 */
async function showLoyaltyLeaderboard(interaction) {
    try {
        const sortedUsers = Array.from(loyaltyData.entries())
            .sort(([, a], [, b]) => b.totalPoints - a.totalPoints)
            .slice(0, 10);
        
        if (sortedUsers.length === 0) {
            await interaction.reply({
                content: '📊 Belum ada data loyalty untuk ditampilkan.',
                ephemeral: true
            });
            return;
        }
        
        const leaderboard = await Promise.all(
            sortedUsers.map(async ([userId, data], index) => {
                try {
                    const user = await interaction.client.users.fetch(userId);
                    const tierConfig = LOYALTY_TIERS[data.tier];
                    const medal = index < 3 ? ['🥇', '🥈', '🥉'][index] : `${index + 1}.`;
                    return `${medal} **${user.username}** ${tierConfig.badge}\n   ${data.totalPoints} poin total`;
                } catch {
                    return `${index + 1}. Unknown User - ${data.totalPoints} poin`;
                }
            })
        );
        
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🏆 Loyalty Leaderboard')
            .setDescription(leaderboard.join('\n\n'))
            .setFooter({ text: 'Top 10 Member Loyalty Nexus Store' })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
        console.error('Error menampilkan leaderboard:', error);
        await interaction.reply({
            content: '❌ Terjadi kesalahan saat menampilkan leaderboard.',
            ephemeral: true
        });
    }
}

module.exports = {
    setupLoyaltySystem,
    addLoyaltyPoints,
    showUserLoyaltyPoints,
    showRewardShop,
    showLoyaltyLeaderboard,
    LOYALTY_TIERS,
    REWARDS
};