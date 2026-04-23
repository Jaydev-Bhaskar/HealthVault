import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/api_service.dart';
import '../utils/constants.dart';

class MedicinesPage extends StatefulWidget {
  const MedicinesPage({super.key});
  @override
  State<MedicinesPage> createState() => _MedicinesPageState();
}

class _MedicinesPageState extends State<MedicinesPage> {
  List<Map<String, dynamic>> medicines = [];
  List<Map<String, dynamic>> reminders = [];
  bool loading = true;
  bool showAddForm = false;

  // Add form controllers
  final _nameC = TextEditingController();
  final _dosageC = TextEditingController();
  final _prescribedByC = TextEditingController();
  final _notesC = TextEditingController();
  String _frequency = 'once_daily';
  List<String> _timings = ['09:00 AM'];

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() => loading = true);
    try {
      final results = await Future.wait([
        ApiService.get('/medicines'),
        ApiService.get('/medicines/reminders').catchError((_) => []),
      ]);
      setState(() {
        medicines = List<Map<String, dynamic>>.from(results[0] ?? []);
        reminders = List<Map<String, dynamic>>.from(results[1] ?? []);
      });
    } catch (e) {
      _showError('Failed to load medicines');
    }
    setState(() => loading = false);
  }

  Future<void> _addMedicine() async {
    if (_nameC.text.isEmpty || _dosageC.text.isEmpty) {
      _showError('Name and dosage are required');
      return;
    }
    try {
      await ApiService.post('/medicines', {
        'name': _nameC.text,
        'dosage': _dosageC.text,
        'frequency': _frequency,
        'timings': _timings,
        'prescribedBy': _prescribedByC.text,
        'notes': _notesC.text,
      });
      _nameC.clear();
      _dosageC.clear();
      _prescribedByC.clear();
      _notesC.clear();
      setState(() => showAddForm = false);
      _fetchData();
    } catch (e) {
      _showError('Failed to add medicine: ${e.toString().replaceFirst("Exception: ", "")}');
    }
  }

  Future<void> _markAsTaken(String id, String timing) async {
    try {
      await ApiService.post('/medicines/$id/taken', {'timing': timing});
      _fetchData();
    } catch (_) {}
  }

  Future<void> _toggleActive(Map<String, dynamic> med) async {
    try {
      await ApiService.put('/medicines/${med['_id']}', {'isActive': !(med['isActive'] ?? true)});
      _fetchData();
    } catch (_) {}
  }

  Future<void> _deleteMedicine(String id) async {
    try {
      await ApiService.delete('/medicines/$id');
      _fetchData();
    } catch (_) {}
  }

  void _showError(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(msg), backgroundColor: AppColors.error, behavior: SnackBarBehavior.floating));
  }

  @override
  Widget build(BuildContext context) {
    final active = medicines.where((m) => m['isActive'] == true).toList();
    final inactive = medicines.where((m) => m['isActive'] != true).toList();

    // Get refill alerts from reminders
    final refillAlerts = reminders.where((r) => r['needsRefill'] == true).toList();

    return Scaffold(
      appBar: AppBar(
        title: Text('Medicine Tracker', style: GoogleFonts.manrope(fontSize: 20, fontWeight: FontWeight.w800)),
        actions: [
          IconButton(
            onPressed: () => setState(() => showAddForm = !showAddForm),
            icon: Icon(showAddForm ? Icons.close : Icons.add),
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
                    // Add form
                    if (showAddForm)
                      Container(
                        margin: const EdgeInsets.only(bottom: 16),
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: AppColors.card,
                          borderRadius: BorderRadius.circular(24),
                          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 20)],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Add Medicine', style: GoogleFonts.manrope(fontSize: 16, fontWeight: FontWeight.w700)),
                            const SizedBox(height: 14),
                            TextField(controller: _nameC, decoration: const InputDecoration(hintText: 'Medicine name', prefixIcon: Icon(Icons.medication, size: 18))),
                            const SizedBox(height: 10),
                            TextField(controller: _dosageC, decoration: const InputDecoration(hintText: 'Dosage (e.g. 500mg)', prefixIcon: Icon(Icons.scale, size: 18))),
                            const SizedBox(height: 10),
                            DropdownButtonFormField<String>(
                              initialValue: _frequency,
                              decoration: const InputDecoration(prefixIcon: Icon(Icons.schedule, size: 18)),
                              items: const [
                                DropdownMenuItem(value: 'once_daily', child: Text('Once daily')),
                                DropdownMenuItem(value: 'twice_daily', child: Text('Twice daily')),
                                DropdownMenuItem(value: 'thrice_daily', child: Text('Thrice daily')),
                                DropdownMenuItem(value: 'weekly', child: Text('Weekly')),
                                DropdownMenuItem(value: 'as_needed', child: Text('As needed')),
                              ],
                              onChanged: (v) {
                                setState(() {
                                  _frequency = v ?? 'once_daily';
                                  if (_frequency == 'twice_daily') _timings = ['09:00 AM', '09:00 PM'];
                                  if (_frequency == 'thrice_daily') _timings = ['08:00 AM', '02:00 PM', '09:00 PM'];
                                  if (_frequency == 'once_daily') _timings = ['09:00 AM'];
                                });
                              },
                            ),
                            const SizedBox(height: 10),
                            TextField(controller: _prescribedByC, decoration: const InputDecoration(hintText: 'Prescribed by (doctor name)', prefixIcon: Icon(Icons.person, size: 18))),
                            const SizedBox(height: 10),
                            TextField(controller: _notesC, decoration: const InputDecoration(hintText: 'Notes (optional)'), maxLines: 2),
                            const SizedBox(height: 14),
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton(
                                onPressed: _addMedicine,
                                style: ElevatedButton.styleFrom(backgroundColor: AppColors.secondary, foregroundColor: Colors.white, padding: const EdgeInsets.all(14)),
                                child: const Text('Add Medicine'),
                              ),
                            ),
                          ],
                        ),
                      ),

                    // Today's Schedule
                    if (reminders.isNotEmpty) ...[
                      Text("📋 Today's Schedule", style: GoogleFonts.manrope(fontSize: 16, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 10),
                      ...reminders.map((r) => _buildReminderCard(r)),
                      const SizedBox(height: 20),
                    ],

                    // Refill alerts
                    if (refillAlerts.isNotEmpty) ...[
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFF3E0),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFFF9800).withValues(alpha: 0.3)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('⚠️ Refill Needed', style: GoogleFonts.manrope(fontSize: 14, fontWeight: FontWeight.w700, color: const Color(0xFFE65100))),
                            const SizedBox(height: 6),
                            ...refillAlerts.map((r) => Text('• ${r['name']} (${r['dosage']})', style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFFE65100)))),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),
                    ],

                    // Active medicines
                    Text('💊 Active Medicines (${active.length})', style: GoogleFonts.manrope(fontSize: 16, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 10),
                    if (active.isEmpty)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(32),
                        decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(20)),
                        child: Column(
                          children: [
                            const Icon(Icons.medication_outlined, size: 48, color: AppColors.outline),
                            const SizedBox(height: 8),
                            Text('No active medicines', style: GoogleFonts.inter(color: AppColors.outline)),
                          ],
                        ),
                      ),
                    ...active.map((m) => _buildMedCard(m)),

                    // Inactive medicines
                    if (inactive.isNotEmpty) ...[
                      const SizedBox(height: 20),
                      Text('📦 Past Medicines (${inactive.length})', style: GoogleFonts.manrope(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.outline)),
                      const SizedBox(height: 10),
                      ...inactive.map((m) => _buildMedCard(m, dimmed: true)),
                    ],
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildReminderCard(Map<String, dynamic> r) {
    final pendingTimings = List<String>.from(r['pendingTimings'] ?? []);
    final takenToday = List<String>.from(r['takenToday'] ?? []);

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
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(r['name'] ?? '', style: GoogleFonts.manrope(fontSize: 15, fontWeight: FontWeight.w700)),
                    Text(r['dosage'] ?? '', style: GoogleFonts.inter(fontSize: 12, color: AppColors.outline)),
                  ],
                ),
              ),
              Text('${takenToday.length}/${(r['timings'] as List? ?? []).length}',
                  style: GoogleFonts.manrope(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.secondary)),
            ],
          ),
          if (pendingTimings.isNotEmpty || takenToday.isNotEmpty) ...[
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                ...takenToday.map((t) => Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(color: const Color(0xFFE8F5E9), borderRadius: BorderRadius.circular(100)),
                      child: Text('✓ $t', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w500, color: const Color(0xFF2E7D32))),
                    )),
                ...pendingTimings.map((t) => InkWell(
                      onTap: () => _markAsTaken(r['_id'], t),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(color: AppColors.primaryContainer, borderRadius: BorderRadius.circular(100)),
                        child: Text('Take $t', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.primary)),
                      ),
                    )),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildMedCard(Map<String, dynamic> med, {bool dimmed = false}) {
    final timings = List<String>.from(med['timings'] ?? []);
    return Opacity(
      opacity: dimmed ? 0.5 : 1.0,
      child: Container(
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
                  width: 40, height: 40,
                  decoration: BoxDecoration(color: AppColors.primaryContainer.withValues(alpha: 0.3), borderRadius: BorderRadius.circular(12)),
                  child: const Icon(Icons.medication, color: AppColors.primary, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(med['name'] ?? '', style: GoogleFonts.manrope(fontSize: 15, fontWeight: FontWeight.w700)),
                      Text('${med['dosage'] ?? ''} • ${_formatFrequency(med['frequency'])}',
                          style: GoogleFonts.inter(fontSize: 12, color: AppColors.outline)),
                    ],
                  ),
                ),
                PopupMenuButton(
                  icon: const Icon(Icons.more_vert, size: 18),
                  onSelected: (val) {
                    if (val == 'toggle') _toggleActive(med);
                    if (val == 'delete') _deleteMedicine(med['_id']);
                  },
                  itemBuilder: (_) => [
                    PopupMenuItem(value: 'toggle', child: Text(med['isActive'] == true ? 'Mark Inactive' : 'Reactivate')),
                    const PopupMenuItem(value: 'delete', child: Row(children: [Icon(Icons.delete, size: 18, color: Colors.red), SizedBox(width: 8), Text('Delete')])),
                  ],
                ),
              ],
            ),
            if (timings.isNotEmpty) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 6,
                children: timings.map((t) => Chip(
                      label: Text(t, style: GoogleFonts.inter(fontSize: 11)),
                      backgroundColor: AppColors.surfaceContainerHigh,
                      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      visualDensity: const VisualDensity(vertical: -4),
                    )).toList(),
              ),
            ],
            if (med['prescribedBy'] != null && med['prescribedBy'].isNotEmpty) ...[
              const SizedBox(height: 4),
              Text('Prescribed by: ${med['prescribedBy']}', style: GoogleFonts.inter(fontSize: 11, color: AppColors.outline)),
            ],
            if (med['notes'] != null && med['notes'].isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(med['notes'], style: GoogleFonts.inter(fontSize: 11, color: AppColors.outline, fontStyle: FontStyle.italic)),
            ],
          ],
        ),
      ),
    );
  }

  String _formatFrequency(dynamic f) {
    switch (f) {
      case 'once_daily': return 'Once daily';
      case 'twice_daily': return 'Twice daily';
      case 'thrice_daily': return 'Thrice daily';
      case 'weekly': return 'Weekly';
      case 'as_needed': return 'As needed';
      default: return f?.toString() ?? '';
    }
  }
}
