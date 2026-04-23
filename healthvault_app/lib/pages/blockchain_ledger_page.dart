import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/api_service.dart';
import '../utils/constants.dart';

class BlockchainLedgerPage extends StatefulWidget {
  const BlockchainLedgerPage({super.key});
  @override
  State<BlockchainLedgerPage> createState() => _BlockchainLedgerPageState();
}

class _BlockchainLedgerPageState extends State<BlockchainLedgerPage> {
  List<Map<String, dynamic>> blocks = [];
  Map<String, dynamic>? stats;
  Map<String, dynamic>? verification;
  bool loading = true;
  bool verifying = false;

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() => loading = true);
    try {
      final results = await Future.wait([
        ApiService.get('/blockchain/ledger'),
        ApiService.get('/blockchain/stats'),
      ]);
      setState(() {
        blocks = List<Map<String, dynamic>>.from(results[0] ?? []);
        stats = results[1] is Map ? Map<String, dynamic>.from(results[1]) : null;
      });
    } catch (_) {}
    setState(() => loading = false);
  }

  Future<void> _verifyChain() async {
    setState(() => verifying = true);
    try {
      final data = await ApiService.get('/blockchain/verify');
      setState(() => verification = Map<String, dynamic>.from(data));
    } catch (e) {
      _showError('Verification failed: ${e.toString().replaceFirst("Exception: ", "")}');
    }
    setState(() => verifying = false);
  }

  void _showError(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(msg), backgroundColor: AppColors.error, behavior: SnackBarBehavior.floating));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Blockchain Ledger', style: GoogleFonts.manrope(fontSize: 20, fontWeight: FontWeight.w800)),
        actions: [
          IconButton(
            onPressed: verifying ? null : _verifyChain,
            icon: verifying
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.verified_user, color: AppColors.secondary),
            tooltip: 'Verify Chain',
          ),
        ],
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.secondary))
          : RefreshIndicator(
              onRefresh: _fetchData,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Verification status
                    if (verification != null)
                      Container(
                        width: double.infinity,
                        margin: const EdgeInsets.only(bottom: 16),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: verification!['valid'] == true ? const Color(0xFFE8F5E9) : const Color(0xFFFCE4EC),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: verification!['valid'] == true
                                ? const Color(0xFF2E7D32).withValues(alpha: 0.3)
                                : Colors.red.withValues(alpha: 0.3),
                          ),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              verification!['valid'] == true ? Icons.check_circle : Icons.error,
                              color: verification!['valid'] == true ? const Color(0xFF2E7D32) : Colors.red,
                              size: 24,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    verification!['valid'] == true ? '✅ Chain Integrity Verified' : '❌ Chain Integrity Broken',
                                    style: GoogleFonts.manrope(fontSize: 14, fontWeight: FontWeight.w700,
                                        color: verification!['valid'] == true ? const Color(0xFF2E7D32) : Colors.red),
                                  ),
                                  if (verification!['verifiedBlocks'] != null)
                                    Text('${verification!['verifiedBlocks']} blocks verified',
                                        style: GoogleFonts.inter(fontSize: 12, color: AppColors.outline)),
                                ],
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.close, size: 16),
                              onPressed: () => setState(() => verification = null),
                            ),
                          ],
                        ),
                      ),

                    // Stats
                    if (stats != null)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: AppColors.card,
                          borderRadius: BorderRadius.circular(24),
                          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 20)],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('⛓️ Chain Statistics', style: GoogleFonts.manrope(fontSize: 16, fontWeight: FontWeight.w700)),
                            const SizedBox(height: 14),
                            Row(
                              children: [
                                _statCard('Total Blocks', '${stats!['totalBlocks'] ?? 0}', AppColors.secondary),
                                const SizedBox(width: 10),
                                _statCard('Your Tx', '${stats!['yourTransactions'] ?? 0}', AppColors.primary),
                                const SizedBox(width: 10),
                                _statCard('Latest #', '${stats!['latestBlockIndex'] ?? 0}', const Color(0xFF7E57C2)),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(color: AppColors.surfaceContainerLow, borderRadius: BorderRadius.circular(10)),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('Latest Hash', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.outline)),
                                  const SizedBox(height: 2),
                                  Text(stats!['latestBlockHash']?.toString().substring(0, 40) ?? 'N/A',
                                      style: GoogleFonts.sourceCodePro(fontSize: 10, color: AppColors.onSurfaceVariant)),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    const SizedBox(height: 20),

                    // Blocks list
                    Text('📜 Transaction Ledger (${blocks.length})',
                        style: GoogleFonts.manrope(fontSize: 16, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 10),
                    if (blocks.isEmpty)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(32),
                        decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(20)),
                        child: Column(
                          children: [
                            const Icon(Icons.link_off, size: 48, color: AppColors.outline),
                            const SizedBox(height: 8),
                            Text('No blockchain transactions yet', style: GoogleFonts.inter(color: AppColors.outline)),
                          ],
                        ),
                      ),
                    ...blocks.map((b) => _buildBlockCard(b)),
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _statCard(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          children: [
            Text(value, style: GoogleFonts.manrope(fontSize: 22, fontWeight: FontWeight.w800, color: color)),
            const SizedBox(height: 2),
            Text(label, style: GoogleFonts.inter(fontSize: 10, color: AppColors.outline)),
          ],
        ),
      ),
    );
  }

  Widget _buildBlockCard(Map<String, dynamic> block) {
    final actionIcons = {
      'RECORD_UPLOADED': Icons.upload_file,
      'ACCESS_GRANTED': Icons.lock_open,
      'ACCESS_GRANTED_QR': Icons.qr_code_2,
      'ACCESS_REVOKED': Icons.lock,
      'ACCESS_EDITED': Icons.edit,
      'EMERGENCY_ACCESS': Icons.emergency,
      'GENESIS': Icons.power,
    };
    final action = block['action']?.toString() ?? '';
    final actionColors = {
      'RECORD_UPLOADED': AppColors.secondary,
      'ACCESS_GRANTED': const Color(0xFF2E7D32),
      'ACCESS_GRANTED_QR': const Color(0xFF2E7D32),
      'ACCESS_REVOKED': Colors.red,
      'EMERGENCY_ACCESS': const Color(0xFFD32F2F),
      'GENESIS': const Color(0xFF7E57C2),
    };

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 15)],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36, height: 36,
                decoration: BoxDecoration(
                  color: (actionColors[action] ?? AppColors.outline).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(actionIcons[action] ?? Icons.link, size: 18, color: actionColors[action] ?? AppColors.outline),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(action.replaceAll('_', ' '), style: GoogleFonts.manrope(fontSize: 13, fontWeight: FontWeight.w700)),
                    Text('Block #${block['index'] ?? '?'}', style: GoogleFonts.inter(fontSize: 11, color: AppColors.outline)),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: (actionColors[action] ?? AppColors.outline).withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(100),
                ),
                child: Text(block['actorRole']?.toString() ?? '', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w500, color: actionColors[action] ?? AppColors.outline)),
              ),
            ],
          ),
          if (block['details'] != null) ...[
            const SizedBox(height: 8),
            Text(block['details'], style: GoogleFonts.inter(fontSize: 12, color: AppColors.onSurfaceVariant, height: 1.4)),
          ],
          const SizedBox(height: 8),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: AppColors.surfaceContainerLow, borderRadius: BorderRadius.circular(8)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text('Hash: ', style: GoogleFonts.inter(fontSize: 9, fontWeight: FontWeight.w600, color: AppColors.outline)),
                    Expanded(
                      child: Text(
                        block['hash']?.toString().substring(0, 20) ?? '',
                        style: GoogleFonts.sourceCodePro(fontSize: 9, color: AppColors.onSurfaceVariant),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                Text(_formatDate(block['timestamp']), style: GoogleFonts.inter(fontSize: 9, color: AppColors.outline)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(dynamic dateStr) {
    if (dateStr == null) return '';
    try {
      final d = DateTime.parse(dateStr.toString());
      final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return '${months[d.month - 1]} ${d.day}, ${d.year} at ${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return dateStr.toString();
    }
  }
}
