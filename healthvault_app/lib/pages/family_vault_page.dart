import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/api_service.dart';
import '../utils/constants.dart';

class FamilyVaultPage extends StatefulWidget {
  const FamilyVaultPage({super.key});
  @override
  State<FamilyVaultPage> createState() => _FamilyVaultPageState();
}

class _FamilyVaultPageState extends State<FamilyVaultPage> {
  List<Map<String, dynamic>> members = [];
  List<Map<String, dynamic>> requests = [];
  Map<String, dynamic>? dashboard;
  bool loading = true;
  bool sending = false;
  final _identifierC = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() => loading = true);
    try {
      final results = await Future.wait([
        ApiService.get('/auth/family'),
        ApiService.get('/auth/family/requests').catchError((_) => []),
        ApiService.get('/family/dashboard').catchError((_) => null),
      ]);
      setState(() {
        members = List<Map<String, dynamic>>.from(results[0] ?? []);
        requests = List<Map<String, dynamic>>.from(results[1] ?? []);
        dashboard = results[2] is Map ? Map<String, dynamic>.from(results[2]) : null;
      });
    } catch (_) {}
    setState(() => loading = false);
  }

  Future<void> _sendRequest() async {
    if (_identifierC.text.trim().isEmpty) return;
    setState(() => sending = true);
    try {
      await ApiService.post('/auth/family/request', {'identifier': _identifierC.text.trim()});
      _identifierC.clear();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('✅ Family request sent!'), backgroundColor: Color(0xFF2E7D32)),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceFirst('Exception: ', '')), backgroundColor: AppColors.error),
        );
      }
    }
    setState(() => sending = false);
  }

  Future<void> _acceptRequest(String requesterId) async {
    try {
      await ApiService.post('/auth/family/accept', {'requesterId': requesterId});
      _fetchData();
    } catch (_) {}
  }

  Future<void> _rejectRequest(String requesterId) async {
    try {
      await ApiService.post('/auth/family/reject', {'requesterId': requesterId});
      _fetchData();
    } catch (_) {}
  }

  Future<void> _removeMember(String memberId) async {
    try {
      await ApiService.delete('/auth/family/$memberId');
      _fetchData();
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Family Vault', style: GoogleFonts.manrope(fontSize: 20, fontWeight: FontWeight.w800)),
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
                    // Add member
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: AppColors.card,
                        borderRadius: BorderRadius.circular(24),
                        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 20)],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('➕ Link Family Member', style: GoogleFonts.manrope(fontSize: 16, fontWeight: FontWeight.w700)),
                          const SizedBox(height: 4),
                          Text('Search by Health ID, email, or name', style: GoogleFonts.inter(fontSize: 12, color: AppColors.outline)),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  controller: _identifierC,
                                  decoration: const InputDecoration(hintText: 'Health ID / Email / Name', prefixIcon: Icon(Icons.search, size: 18)),
                                ),
                              ),
                              const SizedBox(width: 10),
                              ElevatedButton(
                                onPressed: sending ? null : _sendRequest,
                                style: ElevatedButton.styleFrom(backgroundColor: AppColors.secondary, foregroundColor: Colors.white, padding: const EdgeInsets.all(14)),
                                child: sending
                                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                    : const Text('Send'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Incoming requests
                    if (requests.isNotEmpty) ...[
                      Text('📬 Pending Requests (${requests.length})', style: GoogleFonts.manrope(fontSize: 16, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 10),
                      ...requests.map((r) => Container(
                            margin: const EdgeInsets.only(bottom: 10),
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFFF8E1),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: const Color(0xFFFFE082)),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 44, height: 44,
                                  decoration: BoxDecoration(color: AppColors.secondaryContainer, shape: BoxShape.circle),
                                  child: Center(child: Text(r['name']?.toString().substring(0, 1) ?? '?', style: GoogleFonts.manrope(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.secondary))),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(r['name'] ?? 'Unknown', style: GoogleFonts.manrope(fontSize: 14, fontWeight: FontWeight.w600)),
                                      Text(r['healthId'] ?? r['email'] ?? '', style: GoogleFonts.inter(fontSize: 12, color: AppColors.outline)),
                                    ],
                                  ),
                                ),
                                IconButton(
                                  onPressed: () => _acceptRequest(r['_id']),
                                  icon: const Icon(Icons.check_circle, color: Color(0xFF2E7D32)),
                                ),
                                IconButton(
                                  onPressed: () => _rejectRequest(r['_id']),
                                  icon: const Icon(Icons.cancel, color: Colors.red),
                                ),
                              ],
                            ),
                          )),
                      const SizedBox(height: 20),
                    ],

                    // Members
                    Text('👨‍👩‍👧 Family Members (${members.length})', style: GoogleFonts.manrope(fontSize: 16, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 10),
                    if (members.isEmpty)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(32),
                        decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(20)),
                        child: Column(
                          children: [
                            const Icon(Icons.family_restroom, size: 48, color: AppColors.outline),
                            const SizedBox(height: 8),
                            Text('No family members linked yet', style: GoogleFonts.inter(color: AppColors.outline)),
                          ],
                        ),
                      ),
                    ...members.map((m) => _buildMemberCard(m)),

                    // Dashboard data (caregiver insights)
                    if (dashboard != null && dashboard!['familySummary'] != null) ...[
                      const SizedBox(height: 20),
                      Text('🏥 Family Health Overview', style: GoogleFonts.manrope(fontSize: 16, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 10),
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
                            if (dashboard!['riskAnalysis'] != null)
                              Text(dashboard!['riskAnalysis'].toString(),
                                  style: GoogleFonts.inter(fontSize: 13, color: AppColors.onSurfaceVariant, height: 1.5)),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildMemberCard(Map<String, dynamic> member) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 15)],
      ),
      child: Row(
        children: [
          Container(
            width: 50, height: 50,
            decoration: const BoxDecoration(color: AppColors.secondaryContainer, shape: BoxShape.circle),
            child: Center(
              child: Text(member['name']?.toString().substring(0, 1) ?? '?',
                  style: GoogleFonts.manrope(fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.secondary)),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(member['name'] ?? '', style: GoogleFonts.manrope(fontSize: 15, fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Row(
                  children: [
                    _chip('HID: ${member['healthId'] ?? '—'}'),
                    const SizedBox(width: 6),
                    if (member['bloodGroup'] != null) _chip(member['bloodGroup']),
                    const SizedBox(width: 6),
                    if (member['age'] != null) _chip('Age: ${member['age']}'),
                  ],
                ),
                if (member['healthScore'] != null) ...[
                  const SizedBox(height: 4),
                  Text('Health Score: ${member['healthScore']}', style: GoogleFonts.inter(fontSize: 11, color: AppColors.secondary, fontWeight: FontWeight.w600)),
                ],
              ],
            ),
          ),
          IconButton(
            onPressed: () => _removeMember(member['_id']),
            icon: const Icon(Icons.remove_circle_outline, color: Colors.red, size: 20),
          ),
        ],
      ),
    );
  }

  Widget _chip(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(color: AppColors.surfaceContainerHigh, borderRadius: BorderRadius.circular(100)),
      child: Text(text, style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w500, color: AppColors.outline)),
    );
  }
}
