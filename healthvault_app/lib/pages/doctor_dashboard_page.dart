import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/api_service.dart';
import '../utils/constants.dart';
import 'chat_page.dart';
import 'video_call_page.dart';
import 'qr_scanner_page.dart';

class DoctorDashboardPage extends StatefulWidget {
  const DoctorDashboardPage({super.key});
  @override
  State<DoctorDashboardPage> createState() => _DoctorDashboardPageState();
}

class _DoctorDashboardPageState extends State<DoctorDashboardPage> {
  List<Map<String, dynamic>> patients = [];
  Map<String, dynamic>? stats;
  List<Map<String, dynamic>> appointments = [];
  Map<String, dynamic>? selectedPatient;
  List<Map<String, dynamic>> records = [];
  List<Map<String, dynamic>> medicines = [];
  bool loading = true;
  String mainTab = 'patients';
  String detailTab = 'records';
  String viewError = '';

  // Simulation
  Map<String, dynamic>? simulationData;
  bool simLoading = false;
  String simError = '';
  int simDays = 30;
  String simMode = 'compare';

  // Note form
  final _titleC = TextEditingController();
  final _noteC = TextEditingController();
  final _diagC = TextEditingController();
  List<Map<String, String>> prescriptions = [{'name': '', 'dosage': '', 'frequency': 'once_daily'}];
  String noteMsg = '';

  // Settings
  String consultationFee = '500';
  String paymentUPI = '';
  List<String> availableDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  String timeStart = '09:00';
  String timeEnd = '17:00';

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() => loading = true);
    try {
      final results = await Future.wait([
        ApiService.get('/doctor/my-patients'),
        ApiService.get('/doctor/stats'),
        ApiService.get('/appointments/my-appointments'),
      ]);
      setState(() {
        patients = List<Map<String, dynamic>>.from(results[0] ?? []);
        stats = results[1] is Map ? Map<String, dynamic>.from(results[1]) : null;
        appointments = List<Map<String, dynamic>>.from(results[2] ?? []);
        if (stats != null) {
          consultationFee = (stats!['consultationFee'] ?? 500).toString();
          paymentUPI = stats!['paymentUPI'] ?? '';
          final days = stats!['availableDays'];
          if (days is List && days.isNotEmpty) availableDays = List<String>.from(days);
          timeStart = stats!['availableTimeStart'] ?? '09:00';
          timeEnd = stats!['availableTimeEnd'] ?? '17:00';
        }
      });
    } catch (_) {}
    setState(() => loading = false);
  }

  Future<void> _selectPatient(Map<String, dynamic> p) async {
    setState(() { selectedPatient = p; detailTab = 'records'; viewError = ''; records = []; medicines = []; });
    final pid = p['patient']?['_id'];
    if (pid == null) return;
    try {
      final results = await Future.wait([
        ApiService.get('/doctor/patient/$pid/records'),
        ApiService.get('/doctor/patient/$pid/medicines'),
      ]);
      setState(() {
        records = List<Map<String, dynamic>>.from(results[0] ?? []);
        medicines = List<Map<String, dynamic>>.from(results[1] ?? []);
      });
    } catch (e) {
      setState(() => viewError = e.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<void> _submitNote() async {
    final pid = selectedPatient?['patient']?['_id'];
    if (pid == null || _titleC.text.isEmpty) return;
    try {
      await ApiService.post('/doctor/patient/$pid/note', {
        'title': _titleC.text,
        'note': _noteC.text,
        'diagnosis': _diagC.text,
        'prescriptions': prescriptions.where((p) => p['name']!.isNotEmpty).toList(),
      });
      setState(() { noteMsg = '✅ Consultation note added!'; _titleC.clear(); _noteC.clear(); _diagC.clear();
        prescriptions = [{'name': '', 'dosage': '', 'frequency': 'once_daily'}]; });
      _selectPatient(selectedPatient!);
    } catch (e) {
      setState(() => noteMsg = '❌ ${e.toString().replaceFirst("Exception: ", "")}');
    }
  }

  Future<void> _cancelAppointment(String id) async {
    try {
      await ApiService.post('/appointments/$id/cancel', {});
      _showMsg('Appointment cancelled');
      _fetchData();
    } catch (e) { _showMsg(e.toString(), error: true); }
  }

  Future<void> _refundAppointment(String id) async {
    try {
      await ApiService.post('/appointments/$id/refund', {});
      _showMsg('Refund processed');
      _fetchData();
    } catch (e) { _showMsg(e.toString(), error: true); }
  }

  Future<void> _saveSettings() async {
    try {
      await ApiService.post('/doctor/settings', {
        'consultationFee': int.tryParse(consultationFee) ?? 500,
        'paymentUPI': paymentUPI,
        'availableDays': availableDays,
        'availableTimeStart': timeStart,
        'availableTimeEnd': timeEnd,
      });
      _showMsg('Settings saved!');
    } catch (e) { _showMsg(e.toString(), error: true); }
  }

  void _showMsg(String msg, {bool error = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg.replaceFirst('Exception: ', '')),
      backgroundColor: error ? AppColors.error : const Color(0xFF2E7D32),
      behavior: SnackBarBehavior.floating,
    ));
  }

  Future<void> _scanPatientQR() async {
    final result = await Navigator.push(context, MaterialPageRoute(builder: (_) => const QRScannerPage(title: 'Scan Patient QR')));
    if (result != null && result is Map && result['healthId'] != null) {
      _showMsg('QR recognized! Requesting access...', error: false);
      try {
        await ApiService.post('/access/grant-by-scan', {'healthId': result['healthId']});
        _showMsg('✅ Access granted for ${result['healthId']}!');
        _fetchData();
      } catch (e) {
        _showMsg(e.toString(), error: true);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('👨‍⚕️ Doctor Portal', style: GoogleFonts.manrope(fontSize: 20, fontWeight: FontWeight.w800)),
        actions: [
          if (mainTab == 'patients')
            IconButton(onPressed: _scanPatientQR, icon: const Icon(Icons.qr_code_scanner), tooltip: 'Scan Patient QR'),
          if (stats != null)
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Chip(label: Text(stats!['doctorCode'] ?? '', style: GoogleFonts.manrope(fontWeight: FontWeight.w700, fontSize: 12)),
                backgroundColor: AppColors.primaryContainer),
            ),
        ],
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.secondary))
          : Column(
              children: [
                // Stats row
                if (stats != null)
                  SizedBox(
                    height: 70,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      children: [
                        _statChip('Specialty', stats!['specialty'] ?? '—'),
                        _statChip('Patients', '${stats!['totalActivePatients'] ?? 0}'),
                        _statChip('Consults', '${stats!['totalConsultations'] ?? 0}'),
                      ],
                    ),
                  ),
                // Main tabs
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Row(
                    children: [
                      _tabChip('patients', '🧑 Patients'),
                      _tabChip('appointments', '📅 Appointments'),
                      _tabChip('settings', '⚙️ Settings'),
                    ],
                  ),
                ),
                Expanded(child: _buildMainContent()),
              ],
            ),
    );
  }

  Widget _statChip(String label, String value) => Container(
    margin: const EdgeInsets.only(right: 10),
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
    decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(16),
      boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 10)]),
    child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
      Text(value, style: GoogleFonts.manrope(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.secondary)),
      Text(label, style: GoogleFonts.inter(fontSize: 10, color: AppColors.outline)),
    ]),
  );

  Widget _tabChip(String id, String label) => Padding(
    padding: const EdgeInsets.only(right: 8),
    child: ChoiceChip(label: Text(label), selected: mainTab == id, onSelected: (_) => setState(() { mainTab = id; selectedPatient = null; }),
      selectedColor: AppColors.primaryContainer, showCheckmark: false,
      labelStyle: GoogleFonts.inter(fontSize: 13, fontWeight: mainTab == id ? FontWeight.w600 : FontWeight.w400)),
  );

  Widget _buildMainContent() {
    if (mainTab == 'appointments') return _buildAppointments();
    if (mainTab == 'settings') return _buildSettings();
    return selectedPatient != null ? _buildPatientDetail() : _buildPatientList();
  }

  // ── Patient List ──
  Widget _buildPatientList() {
    if (patients.isEmpty) {
      return Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
        const Icon(Icons.people_outline, size: 64, color: AppColors.outline),
        const SizedBox(height: 12),
        Text('No patients yet', style: GoogleFonts.manrope(fontSize: 16, color: AppColors.outline)),
        const SizedBox(height: 4),
        Text('Share your doctor code for patients to grant access', style: GoogleFonts.inter(fontSize: 13, color: AppColors.outline), textAlign: TextAlign.center),
      ]));
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: patients.length,
      itemBuilder: (_, i) {
        final p = patients[i];
        final patient = p['patient'] as Map<String, dynamic>? ?? {};
        return ListTile(
          leading: CircleAvatar(backgroundColor: AppColors.secondaryContainer,
            child: Text(patient['name']?.toString().isNotEmpty == true ? patient['name'][0] : '?',
              style: GoogleFonts.manrope(fontWeight: FontWeight.w700, color: AppColors.secondary))),
          title: Text(patient['name'] ?? 'Patient', style: GoogleFonts.manrope(fontWeight: FontWeight.w600)),
          subtitle: Text('${patient['healthId'] ?? ''} • ${p['accessType'] ?? 'full'}',
            style: GoogleFonts.inter(fontSize: 12, color: AppColors.outline)),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => _selectPatient(p),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          tileColor: AppColors.card,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        );
      },
    );
  }

  // ── Patient Detail ──
  Widget _buildPatientDetail() {
    final patient = selectedPatient!['patient'] as Map<String, dynamic>? ?? {};
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Patient header
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(20)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => setState(() => selectedPatient = null)),
              const SizedBox(width: 8),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(patient['name'] ?? '', style: GoogleFonts.manrope(fontSize: 18, fontWeight: FontWeight.w700)),
                Text('${patient['healthId'] ?? ''} • ${patient['bloodGroup'] ?? 'N/A'} • Age: ${patient['age'] ?? 'N/A'}',
                  style: GoogleFonts.inter(fontSize: 12, color: AppColors.outline)),
              ])),
            ]),
            const SizedBox(height: 10),
            Row(children: [
              _actionBtn(Icons.chat, 'Chat', () {
                Navigator.push(context, MaterialPageRoute(builder: (_) => ChatPage(
                  partnerId: patient['_id'], partnerName: patient['name'] ?? '', partnerRole: 'patient')));
              }),
              const SizedBox(width: 8),
              Chip(label: Text('${selectedPatient!['accessType'] ?? 'full'} access',
                style: GoogleFonts.inter(fontSize: 11)), backgroundColor: const Color(0xFFE8F5E9)),
            ]),
          ]),
        ),
        if (viewError.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 12),
          child: Text(viewError, style: GoogleFonts.inter(color: AppColors.error))),
        const SizedBox(height: 12),
        // Detail tabs
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(children: [
            _detailTab('records', '📄 Records'),
            _detailTab('medicines', '💊 Medicines'),
            _detailTab('simulation', '🕒 Simulator'),
            _detailTab('addNote', '📝 Add Note'),
          ]),
        ),
        const SizedBox(height: 12),
        if (detailTab == 'records') _buildRecords(),
        if (detailTab == 'medicines') _buildMedicines(),
        if (detailTab == 'simulation') _buildSimulation(),
        if (detailTab == 'addNote') _buildNoteForm(),
      ]),
    );
  }

  Widget _actionBtn(IconData icon, String label, VoidCallback onTap) => InkWell(
    onTap: onTap,
    borderRadius: BorderRadius.circular(12),
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(color: AppColors.secondary, borderRadius: BorderRadius.circular(12)),
      child: Row(children: [
        Icon(icon, size: 16, color: Colors.white),
        const SizedBox(width: 6),
        Text(label, style: GoogleFonts.inter(fontSize: 12, color: Colors.white, fontWeight: FontWeight.w600)),
      ]),
    ),
  );

  Widget _detailTab(String id, String label) => Padding(
    padding: const EdgeInsets.only(right: 8),
    child: ChoiceChip(label: Text(label), selected: detailTab == id, onSelected: (_) => setState(() => detailTab = id),
      selectedColor: AppColors.primaryContainer, showCheckmark: false,
      labelStyle: GoogleFonts.inter(fontSize: 12, fontWeight: detailTab == id ? FontWeight.w600 : FontWeight.w400)),
  );

  Widget _buildRecords() {
    if (records.isEmpty) return _emptyCard('No records found');
    return Column(children: records.map((r) => Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(16)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Text(r['title'] ?? 'Untitled', style: GoogleFonts.manrope(fontSize: 14, fontWeight: FontWeight.w700))),
          if (r['isVerified'] == true) _badge('✓ Verified', const Color(0xFF2E7D32)),
          if (r['source'] == 'doctor_note') _badge('👨‍⚕️ Note', const Color(0xFF1565C0)),
        ]),
        if (r['description'] != null && r['description'].toString().isNotEmpty)
          Padding(padding: const EdgeInsets.only(top: 6),
            child: Text(r['description'], style: GoogleFonts.inter(fontSize: 12, color: AppColors.outline), maxLines: 3)),
        if (r['aiParsedData']?['diagnosis'] != null)
          Container(
            margin: const EdgeInsets.only(top: 8), padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: const Color(0xFFE3F2FD), borderRadius: BorderRadius.circular(8)),
            child: Text('Diagnosis: ${r['aiParsedData']['diagnosis']}',
              style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: const Color(0xFF1565C0))),
          ),
      ]),
    )).toList());
  }

  Widget _buildMedicines() {
    if (medicines.isEmpty) return _emptyCard('No medicines found');
    return Column(children: medicines.map((m) => Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(16)),
      child: Row(children: [
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(m['name'] ?? '', style: GoogleFonts.manrope(fontSize: 14, fontWeight: FontWeight.w700)),
          Text('${m['dosage'] ?? ''} • ${(m['frequency'] ?? '').toString().replaceAll('_', ' ')}',
            style: GoogleFonts.inter(fontSize: 12, color: AppColors.outline)),
        ])),
        _badge(m['isActive'] == true ? 'Active' : 'Inactive', m['isActive'] == true ? const Color(0xFF2E7D32) : AppColors.outline),
      ]),
    )).toList());
  }

  Widget _buildNoteForm() => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(20)),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('📝 Add Consultation Note', style: GoogleFonts.manrope(fontSize: 16, fontWeight: FontWeight.w700)),
      const SizedBox(height: 14),
      TextField(controller: _titleC, decoration: const InputDecoration(hintText: 'Consultation Title *')),
      const SizedBox(height: 10),
      TextField(controller: _diagC, decoration: const InputDecoration(hintText: 'Diagnosis')),
      const SizedBox(height: 10),
      TextField(controller: _noteC, decoration: const InputDecoration(hintText: 'Clinical Notes'), maxLines: 4),
      const SizedBox(height: 14),
      Text('💊 Prescriptions', style: GoogleFonts.manrope(fontSize: 14, fontWeight: FontWeight.w600)),
      ...prescriptions.asMap().entries.map((e) => Padding(
        padding: const EdgeInsets.only(top: 8),
        child: Row(children: [
          Expanded(child: TextField(
            decoration: const InputDecoration(hintText: 'Medicine', isDense: true),
            onChanged: (v) => prescriptions[e.key]['name'] = v,
          )),
          const SizedBox(width: 8),
          Expanded(child: TextField(
            decoration: const InputDecoration(hintText: 'Dosage', isDense: true),
            onChanged: (v) => prescriptions[e.key]['dosage'] = v,
          )),
          IconButton(icon: const Icon(Icons.remove_circle, color: AppColors.error, size: 20),
            onPressed: () => setState(() => prescriptions.removeAt(e.key))),
        ]),
      )),
      TextButton.icon(onPressed: () => setState(() => prescriptions.add({'name': '', 'dosage': '', 'frequency': 'once_daily'})),
        icon: const Icon(Icons.add, size: 16), label: const Text('Add Medicine')),
      const SizedBox(height: 10),
      SizedBox(width: double.infinity, child: ElevatedButton(
        onPressed: _submitNote,
        style: ElevatedButton.styleFrom(backgroundColor: AppColors.secondary, foregroundColor: Colors.white, padding: const EdgeInsets.all(14)),
        child: const Text('Submit Note'),
      )),
      if (noteMsg.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 10),
        child: Text(noteMsg, style: GoogleFonts.inter(fontWeight: FontWeight.w600,
          color: noteMsg.startsWith('✅') ? const Color(0xFF2E7D32) : AppColors.error))),
    ]),
  );

  // ── Simulation ──
  Future<void> _runSimulation() async {
    final pid = selectedPatient?['patient']?['_id'];
    if (pid == null) return;
    setState(() { simLoading = true; simError = ''; simulationData = null; });
    try {
      if (simMode == 'compare') {
        final data = await ApiService.post('/doctor/compare-simulation', {'patientId': pid, 'days': simDays});
        setState(() => simulationData = Map<String, dynamic>.from(data));
      } else {
        final data = await ApiService.post('/doctor/simulate-health', {'patientId': pid, 'days': simDays, 'mode': simMode});
        setState(() => simulationData = Map<String, dynamic>.from(data));
      }
    } catch (e) {
      setState(() => simError = e.toString().replaceFirst('Exception: ', ''));
    }
    setState(() => simLoading = false);
  }

  Widget _buildSimulation() {
    final patientName = selectedPatient?['patient']?['name'] ?? 'Patient';
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(20)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('🕒 Health Time-Travel Simulator', style: GoogleFonts.manrope(fontSize: 16, fontWeight: FontWeight.w700)),
        Text('Predicting future health for $patientName', style: GoogleFonts.inter(fontSize: 12, color: AppColors.outline)),
        const SizedBox(height: 14),
        Row(children: [
          Expanded(child: DropdownButtonFormField<int>(initialValue: simDays, decoration: const InputDecoration(isDense: true, contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
            items: const [DropdownMenuItem(value: 30, child: Text('30 Days')), DropdownMenuItem(value: 60, child: Text('60 Days')), DropdownMenuItem(value: 90, child: Text('90 Days'))],
            onChanged: (v) => setState(() => simDays = v ?? 30))),
          const SizedBox(width: 8),
          SegmentedButton<String>(segments: const [
            ButtonSegment(value: 'compare', label: Text('Compare', style: TextStyle(fontSize: 11))),
            ButtonSegment(value: 'current', label: Text('Current', style: TextStyle(fontSize: 11))),
          ], selected: {simMode}, onSelectionChanged: (s) => setState(() => simMode = s.first)),
        ]),
        const SizedBox(height: 12),
        SizedBox(width: double.infinity, child: ElevatedButton(
          onPressed: simLoading ? null : _runSimulation,
          style: ElevatedButton.styleFrom(backgroundColor: AppColors.secondary, foregroundColor: Colors.white, padding: const EdgeInsets.all(14)),
          child: Text(simLoading ? 'Analyzing...' : '🔬 Run Simulation'),
        )),
        if (simError.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 10), child: Text(simError, style: GoogleFonts.inter(color: AppColors.error))),
        if (simLoading) const Padding(padding: EdgeInsets.all(32), child: Center(child: CircularProgressIndicator(color: AppColors.secondary))),
        if (simulationData != null && !simLoading) _buildSimResults(),
      ]),
    );
  }

  Widget _buildSimResults() {
    final current = simMode == 'compare' ? simulationData!['current'] : simulationData;
    final improved = simMode == 'compare' ? simulationData!['improved'] : null;
    final risks = (current is Map ? current['risks'] : null) ?? {};
    final improvedRisks = (improved is Map ? improved['risks'] : null) ?? {};
    final suggestions = (current is Map ? current['suggestions'] : null) ?? [];
    final explanation = current is Map ? current['explanation'] ?? '' : '';
    final improvedExplanation = improved is Map ? improved['explanation'] ?? '' : '';
    final integratedRecords = current is Map ? current['integratedRecords'] ?? [] : [];

    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const SizedBox(height: 16),
      // Risk cards
      Row(children: [
        Expanded(child: _riskCard('BP Risk', risks['bpRisk'], improvedRisks['bpRisk'], '🫀')),
        const SizedBox(width: 8),
        Expanded(child: _riskCard('Diabetes', risks['diabetesRisk'], improvedRisks['diabetesRisk'], '🩸')),
        const SizedBox(width: 8),
        Expanded(child: _riskCard('Fatigue', risks['fatigueRisk'], improvedRisks['fatigueRisk'], '💤')),
      ]),
      const SizedBox(height: 16),
      // Explanations
      Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: const Color(0xFFE3F2FD), borderRadius: BorderRadius.circular(12)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(simMode == 'compare' ? '🧠 Current Observation' : '🧠 AI Health Insight', style: GoogleFonts.manrope(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFF1565C0))),
          const SizedBox(height: 6),
          Text(explanation.toString(), style: GoogleFonts.inter(fontSize: 12, height: 1.5)),
        ])),
      if (simMode == 'compare' && improvedExplanation.toString().isNotEmpty) ...[  
        const SizedBox(height: 10),
        Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: const Color(0xFFE8F5E9), borderRadius: BorderRadius.circular(12)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('✅ Recommended Solution', style: GoogleFonts.manrope(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFF2E7D32))),
            const SizedBox(height: 6),
            Text(improvedExplanation.toString(), style: GoogleFonts.inter(fontSize: 12, height: 1.5)),
          ])),
      ],
      if ((integratedRecords as List).isNotEmpty) ...[  
        const SizedBox(height: 16),
        Text('📄 Integrated Records', style: GoogleFonts.manrope(fontSize: 14, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        Wrap(spacing: 6, runSpacing: 6, children: (integratedRecords).map<Widget>((t) => Chip(label: Text('🔬 $t', style: GoogleFonts.inter(fontSize: 11)), backgroundColor: const Color(0xFFE3F2FD))).toList()),
      ],
      if ((suggestions as List).isNotEmpty) ...[  
        const SizedBox(height: 16),
        Text('👨‍⚕️ Preventive Recommendations', style: GoogleFonts.manrope(fontSize: 14, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        ...(suggestions).map<Widget>((s) => Container(
          width: double.infinity, margin: const EdgeInsets.only(bottom: 6), padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: AppColors.surfaceContainerLow, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.outlineVariant)),
          child: Text('💡 $s', style: GoogleFonts.inter(fontSize: 13)),
        )),
      ],
    ]);
  }

  Widget _riskCard(String label, dynamic current, dynamic target, String icon) {
    Color riskColor(dynamic level) => level == 'High' ? const Color(0xFFFF5252) : level == 'Moderate' ? const Color(0xFFFB8C00) : const Color(0xFF4CAF50);
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(color: AppColors.surfaceContainerLow, borderRadius: BorderRadius.circular(12), border: Border(left: BorderSide(color: riskColor(current), width: 4))),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: GoogleFonts.inter(fontSize: 10, color: AppColors.outline)),
        const SizedBox(height: 4),
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text(current?.toString() ?? '—', style: GoogleFonts.manrope(fontSize: 13, fontWeight: FontWeight.w800)),
          Text(icon, style: const TextStyle(fontSize: 18)),
        ]),
        if (target != null && target != current)
          Text('→ $target', style: GoogleFonts.inter(fontSize: 10, color: const Color(0xFF2E7D32), fontWeight: FontWeight.w600)),
      ]),
    );
  }

  // ── Appointments ──
  Widget _buildAppointments() {
    final scheduled = appointments.where((a) => a['status'] == 'scheduled').toList();
    if (scheduled.isEmpty) return Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
      const Icon(Icons.calendar_today, size: 64, color: AppColors.outline),
      const SizedBox(height: 12),
      Text('No appointments', style: GoogleFonts.manrope(fontSize: 16, color: AppColors.outline)),
    ]));
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: scheduled.length,
      itemBuilder: (_, i) {
        final apt = scheduled[i];
        final patient = apt['patient'] as Map<String, dynamic>? ?? {};
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(20)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(patient['name'] ?? 'Patient', style: GoogleFonts.manrope(fontSize: 15, fontWeight: FontWeight.w700)),
                Text('${apt['date']} at ${apt['timeSlot']}', style: GoogleFonts.inter(fontSize: 12, color: AppColors.outline)),
              ])),
              TextButton(onPressed: () => _cancelAppointment(apt['_id']),
                child: const Text('Cancel', style: TextStyle(color: AppColors.error, fontSize: 12))),
            ]),
            const SizedBox(height: 8),
            Row(children: [
              _badge(apt['type'] == 'online' ? '🌐 Online' : '🏥 In-Person',
                apt['type'] == 'online' ? const Color(0xFF1565C0) : const Color(0xFFE65100)),
              const SizedBox(width: 8),
              _badge(apt['paymentStatus'] == 'paid' ? '💳 Paid' : '⏳ Pending',
                apt['paymentStatus'] == 'paid' ? const Color(0xFF2E7D32) : const Color(0xFFF57F17)),
              if (apt['paymentStatus'] == 'paid') ...[
                const SizedBox(width: 8),
                InkWell(
                  onTap: () => _refundAppointment(apt['_id']),
                  child: _badge('Refund', AppColors.error),
                ),
              ],
            ]),
            if (apt['type'] == 'online' && apt['paymentStatus'] == 'paid')
              Padding(padding: const EdgeInsets.only(top: 10), child: Row(children: [
                Expanded(child: OutlinedButton.icon(
                  onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) =>
                    ChatPage(partnerId: patient['_id'] ?? '', partnerName: patient['name'] ?? '', partnerRole: 'patient'))),
                  icon: const Icon(Icons.chat, size: 16), label: const Text('Chat'),
                )),
                const SizedBox(width: 8),
                Expanded(child: ElevatedButton.icon(
                  onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) =>
                    VideoCallPage(roomId: apt['_id'], title: 'Consultation with ${patient['name']}'))),
                  icon: const Icon(Icons.videocam, size: 16), label: const Text('Video'),
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.secondary, foregroundColor: Colors.white),
                )),
              ])),
          ]),
        );
      },
    );
  }

  // ── Settings ──
  Widget _buildSettings() => SingleChildScrollView(
    padding: const EdgeInsets.all(16),
    child: Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(20)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('⚙️ Doctor Settings', style: GoogleFonts.manrope(fontSize: 18, fontWeight: FontWeight.w700)),
        const SizedBox(height: 16),
        TextField(decoration: const InputDecoration(hintText: 'Consultation Fee (₹)', prefixIcon: Icon(Icons.currency_rupee, size: 18)),
          keyboardType: TextInputType.number, controller: TextEditingController(text: consultationFee),
          onChanged: (v) => consultationFee = v),
        const SizedBox(height: 10),
        TextField(decoration: const InputDecoration(hintText: 'Payment UPI ID', prefixIcon: Icon(Icons.payment, size: 18)),
          controller: TextEditingController(text: paymentUPI), onChanged: (v) => paymentUPI = v),
        const SizedBox(height: 16),
        Text('Working Days', style: GoogleFonts.manrope(fontSize: 14, fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        Wrap(spacing: 6, runSpacing: 6, children: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) =>
          FilterChip(label: Text(day.substring(0, 3)), selected: availableDays.contains(day), showCheckmark: false,
            selectedColor: AppColors.primaryContainer,
            onSelected: (v) => setState(() { if (v) { availableDays.add(day); } else { availableDays.remove(day); } })),
        ).toList()),
        const SizedBox(height: 16),
        Row(children: [
          Expanded(child: TextField(decoration: const InputDecoration(hintText: 'Start Time'),
            controller: TextEditingController(text: timeStart), onChanged: (v) => timeStart = v)),
          const SizedBox(width: 10),
          Expanded(child: TextField(decoration: const InputDecoration(hintText: 'End Time'),
            controller: TextEditingController(text: timeEnd), onChanged: (v) => timeEnd = v)),
        ]),
        const SizedBox(height: 20),
        SizedBox(width: double.infinity, child: ElevatedButton(
          onPressed: _saveSettings,
          style: ElevatedButton.styleFrom(backgroundColor: AppColors.secondary, foregroundColor: Colors.white, padding: const EdgeInsets.all(16)),
          child: const Text('Save Settings'),
        )),
      ]),
    ),
  );

  Widget _badge(String text, Color color) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(100)),
    child: Text(text, style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w600, color: color)),
  );

  Widget _emptyCard(String msg) => Container(
    width: double.infinity, padding: const EdgeInsets.all(40),
    decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(16)),
    child: Column(children: [
      const Icon(Icons.inbox, size: 48, color: AppColors.outline),
      const SizedBox(height: 8),
      Text(msg, style: GoogleFonts.inter(color: AppColors.outline)),
    ]),
  );
}
