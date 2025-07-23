const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

// Database sederhana untuk inventory (dalam implementasi nyata gunakan database)
const inventory = new Map();
const stockAlerts = new Map();

/**
 * Sistem Inventory Management untuk produk
 * @module inventorySystem
 */

/**
 * Menambah produk baru ke inventory
 * @param {String} productId - ID produk
 * @param {Object} productData - Data produk
 */
function addProduct(productId, productData) {
    inventory.set(productId, {
        id: productId,
        name: productData.name,
        description: productData.description,
        price: productData.price,
        stock: productData.stock || 0,
        minStock: productData.minStock || 5,
        category: productData.category || 'General',
        imageUrl: productData.imageUrl || '',
        isActive: true,
        createdAt: new Date(),
        lastUpdated: new Date(),
        totalSold: 0,
        variants: productData.variants || []
    });
    
    // Cek apakah stock rendah
    checkLowStock(productId);
}

/**
 * Update stock produk
 * @param {String} productId - ID produk
 * @param {Number} quantity - Jumlah perubahan stock (+ untuk menambah, - untuk mengurangi)
 * @param {String} reason - Alasan perubahan
 */
function updateStock(productId, quantity, reason = 'Manual update') {
    const product = inventory.get(productId);
    if (!product) return false;
    
    const oldStock = product.stock;
    product.stock += quantity;
    product.lastUpdated = new Date();
    
    // Jika ini adalah penjualan (quantity negatif)
    if (quantity < 0) {
        product.totalSold += Math.abs(quantity);
    }
    
    inventory.set(productId, product);
    
    // Log perubahan stock
    console.log(`Stock ${product.name} berubah dari ${oldStock} menjadi ${product.stock} (${reason})`);
    
    // Cek low stock setelah update
    checkLowStock(productId);
    
    return true;
}

/**
 * Cek apakah stock produk rendah
 * @param {String} productId - ID produk
 */
function checkLowStock(productId) {
    const product = inventory.get(productId);
    if (!product) return;
    
    if (product.stock <= product.minStock && product.isActive) {
        stockAlerts.set(productId, {
            productId: productId,
            productName: product.name,
            currentStock: product.stock,
            minStock: product.minStock,
            alertTime: new Date()
        });
    } else {
        stockAlerts.delete(productId);
    }
}

/**
 * Setup sistem inventory di channel
 * @param {Client} client - Discord client
 * @param {String} channelId - ID channel
 */
async function setupInventorySystem(client, channelId) {
    try {
        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (!channel) {
            console.error(`Channel dengan ID ${channelId} tidak ditemukan!`);
            return;
        }
        
        const inventoryEmbed = new EmbedBuilder()
            .setColor('#FF6B35')
            .setTitle('📦 Nexus Inventory Management')
            .setDescription('Sistem manajemen inventory otomatis untuk tracking produk dan stock')
            .addFields(
                { name: '📊 Fitur Inventory', value: '• Real-time stock tracking\n• Low stock alerts\n• Sales analytics\n• Product categorization\n• Variant management', inline: false },
                { name: '⚠️ Alert System', value: '• Notifikasi stock rendah\n• Out of stock alerts\n• Restock reminders\n• Sales performance tracking', inline: false },
                { name: '📈 Analytics', value: '• Top selling products\n• Stock movement history\n• Revenue tracking\n• Category performance', inline: false }
            )
            .setImage('https://i.imgur.com/inventory-banner.png')
            .setFooter({ text: 'Nexus Inventory System • Kelola stock dengan mudah!' })
            .setTimestamp();
        
        const inventoryButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('view_inventory')
                    .setLabel('Lihat Inventory')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📦'),
                new ButtonBuilder()
                    .setCustomId('add_stock')
                    .setLabel('Tambah Stock')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('➕'),
                new ButtonBuilder()
                    .setCustomId('low_stock_alerts')
                    .setLabel('Stock Alerts')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('⚠️')
            );
        
        const secondRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('inventory_analytics')
                    .setLabel('Analytics')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📊'),
                new ButtonBuilder()
                    .setCustomId('add_new_product')
                    .setLabel('Produk Baru')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🆕')
            );
        
        await channel.send({
            embeds: [inventoryEmbed],
            components: [inventoryButtons, secondRow]
        });
        
        console.log(`Sistem inventory berhasil diatur di channel ${channel.name}`);
    } catch (error) {
        console.error('Error saat mengatur sistem inventory:', error);
    }
}

/**
 * Menampilkan daftar inventory
 * @param {Interaction} interaction - Discord interaction
 */
async function showInventory(interaction) {
    try {
        const products = Array.from(inventory.values()).filter(p => p.isActive);
        
        if (products.length === 0) {
            await interaction.reply({
                content: '📦 Inventory kosong. Tambahkan produk terlebih dahulu.',
                ephemeral: true
            });
            return;
        }
        
        const itemsPerPage = 5;
        const totalPages = Math.ceil(products.length / itemsPerPage);
        const currentPage = 1;
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const currentProducts = products.slice(startIndex, endIndex);
        
        const productList = currentProducts.map(product => {
            const stockStatus = getStockStatus(product.stock, product.minStock);
            const stockEmoji = stockStatus.emoji;
            
            return `${stockEmoji} **${product.name}**\n` +
                   `   💰 Rp ${product.price.toLocaleString('id-ID')}\n` +
                   `   📦 Stock: ${product.stock} | Min: ${product.minStock}\n` +
                   `   🏷️ ${product.category} | 📈 Terjual: ${product.totalSold}`;
        }).join('\n\n');
        
        const embed = new EmbedBuilder()
            .setColor('#FF6B35')
            .setTitle('📦 Inventory Overview')
            .setDescription(productList)
            .setFooter({ text: `Halaman ${currentPage}/${totalPages} • Total Produk: ${products.length}` })
            .setTimestamp();
        
        // Tambahkan tombol navigasi jika ada lebih dari 1 halaman
        const components = [];
        if (totalPages > 1) {
            const navigationRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('inventory_prev')
                        .setLabel('◀️ Sebelumnya')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage === 1),
                    new ButtonBuilder()
                        .setCustomId('inventory_next')
                        .setLabel('Selanjutnya ▶️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage === totalPages)
                );
            components.push(navigationRow);
        }
        
        await interaction.reply({ embeds: [embed], components, ephemeral: true });
    } catch (error) {
        console.error('Error menampilkan inventory:', error);
        await interaction.reply({
            content: '❌ Terjadi kesalahan saat menampilkan inventory.',
            ephemeral: true
        });
    }
}

/**
 * Mendapatkan status stock
 * @param {Number} currentStock - Stock saat ini
 * @param {Number} minStock - Minimum stock
 * @returns {Object} - Status dengan emoji dan warna
 */
function getStockStatus(currentStock, minStock) {
    if (currentStock === 0) {
        return { emoji: '🔴', status: 'Out of Stock', color: '#FF0000' };
    } else if (currentStock <= minStock) {
        return { emoji: '🟡', status: 'Low Stock', color: '#FFA500' };
    } else {
        return { emoji: '🟢', status: 'In Stock', color: '#00FF00' };
    }
}

/**
 * Menampilkan alert stock rendah
 * @param {Interaction} interaction - Discord interaction
 */
async function showLowStockAlerts(interaction) {
    try {
        const alerts = Array.from(stockAlerts.values());
        
        if (alerts.length === 0) {
            await interaction.reply({
                content: '✅ Tidak ada produk dengan stock rendah saat ini.',
                ephemeral: true
            });
            return;
        }
        
        const alertList = alerts.map(alert => {
            const timeDiff = new Date() - alert.alertTime;
            const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60));
            
            return `🚨 **${alert.productName}**\n` +
                   `   📦 Stock: ${alert.currentStock}/${alert.minStock}\n` +
                   `   ⏰ Alert: ${hoursAgo}h yang lalu`;
        }).join('\n\n');
        
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('⚠️ Stock Alerts')
            .setDescription(alertList)
            .setFooter({ text: `${alerts.length} produk memerlukan restock` })
            .setTimestamp();
        
        const restockButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('bulk_restock')
                    .setLabel('Restock Semua')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('📦')
            );
        
        await interaction.reply({ embeds: [embed], components: [restockButton], ephemeral: true });
    } catch (error) {
        console.error('Error menampilkan stock alerts:', error);
        await interaction.reply({
            content: '❌ Terjadi kesalahan saat menampilkan alerts.',
            ephemeral: true
        });
    }
}

/**
 * Menampilkan analytics inventory
 * @param {Interaction} interaction - Discord interaction
 */
async function showInventoryAnalytics(interaction) {
    try {
        const products = Array.from(inventory.values()).filter(p => p.isActive);
        
        if (products.length === 0) {
            await interaction.reply({
                content: '📊 Belum ada data untuk analytics.',
                ephemeral: true
            });
            return;
        }
        
        // Top selling products
        const topSelling = products
            .sort((a, b) => b.totalSold - a.totalSold)
            .slice(0, 5)
            .map((product, index) => `${index + 1}. **${product.name}** - ${product.totalSold} terjual`)
            .join('\n');
        
        // Stock summary
        const totalProducts = products.length;
        const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
        const lowStockCount = products.filter(p => p.stock <= p.minStock).length;
        const outOfStockCount = products.filter(p => p.stock === 0).length;
        
        // Category breakdown
        const categories = {};
        products.forEach(product => {
            if (!categories[product.category]) {
                categories[product.category] = { count: 0, totalSold: 0 };
            }
            categories[product.category].count++;
            categories[product.category].totalSold += product.totalSold;
        });
        
        const categoryBreakdown = Object.entries(categories)
            .map(([cat, data]) => `**${cat}**: ${data.count} produk, ${data.totalSold} terjual`)
            .join('\n');
        
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('📊 Inventory Analytics')
            .addFields(
                { name: '📈 Summary', value: `Total Produk: ${totalProducts}\nTotal Stock: ${totalStock}\n🟡 Low Stock: ${lowStockCount}\n🔴 Out of Stock: ${outOfStockCount}`, inline: true },
                { name: '🏆 Top Selling Products', value: topSelling || 'Belum ada penjualan', inline: true },
                { name: '🏷️ Category Breakdown', value: categoryBreakdown, inline: false }
            )
            .setFooter({ text: 'Data diperbarui secara real-time' })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
        console.error('Error menampilkan analytics:', error);
        await interaction.reply({
            content: '❌ Terjadi kesalahan saat menampilkan analytics.',
            ephemeral: true
        });
    }
}

/**
 * Mengirim notifikasi low stock ke admin
 * @param {Client} client - Discord client
 * @param {String} alertChannelId - ID channel untuk alert
 */
async function sendLowStockNotification(client, alertChannelId) {
    try {
        const alerts = Array.from(stockAlerts.values());
        if (alerts.length === 0) return;
        
        const channel = await client.channels.fetch(alertChannelId).catch(() => null);
        if (!channel) return;
        
        const alertList = alerts.map(alert => 
            `🚨 **${alert.productName}** - Stock: ${alert.currentStock}/${alert.minStock}`
        ).join('\n');
        
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('⚠️ LOW STOCK ALERT!')
            .setDescription(`${alerts.length} produk memerlukan restock:\n\n${alertList}`)
            .setFooter({ text: 'Segera lakukan restock untuk menghindari kehabisan stock' })
            .setTimestamp();
        
        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error sending low stock notification:', error);
    }
}

module.exports = {
    setupInventorySystem,
    addProduct,
    updateStock,
    showInventory,
    showLowStockAlerts,
    showInventoryAnalytics,
    sendLowStockNotification,
    checkLowStock,
    inventory,
    stockAlerts
};