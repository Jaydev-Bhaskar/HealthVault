import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../services/api_service.dart';
import '../utils/constants.dart';
import 'chat_page.dart';
import 'video_call_page.dart';

class AccessControlPage extends StatefulWidget {
  const AccessControlPage({super.key});
  @override
  State<AccessControlPage> createState() => _AccessControlPageState();
}

class _AccessControlPageState extends State<AccessControlPage> {
  List<Map<String, dynamic>> permissions = [];
  List<Map<String, dynamic>> myAppointments = [];
  List<Map<String, dynamic>> userRecords = [];
  bool loading = true;
  bool showQR = false;
  bool showForm = false;
  bool saving = false;
  Map<String, dynamic>? emergencyQR;

  // Edit Mode
  bool editMode = false;
  String? editId;

  // Grant form
  String doctorName = '';
  String doctorSpecialty = '';
  String hospital = '';
  String doctorCode = '';
  String accessType = 'full';
  bool allowMedicines = false;
  List<String> allowedRecords = [];
  String recordSearch = '';
  List<Map<String, dynamic>> searchResults = [];
  bool searching = false;
  String? selectedDoctorId;

  // Booking
  Map<String, dynamic>? bookingDoctor;
  String bookingDate = '';
  String bookingSlot = '';
  String bookingType = 'online';
  List<String> availableSlots = [];
  bool showPayment = false;

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() => loading = true);
    try {
      final results = await Future.wait([
        ApiService.get('/access').catchError((_) => []),
        ApiService.get('/appointments/my-appointments').catchError((_) => []),
        ApiService.get('/records').catchError((_) => []),
      ]);
      setState(() {
        permissions = List<Map<String, dynamic>>.from(results[0] ?? []);
        myAppointments = List<Map<String, dynamic>>.from(results[1] ?? []);
        userRecords = List<Map<String, dynamic>>.from(results[2] ?? []);
      });
    } catch (_) {}
    setState(() => loading = false);
  }

  Future<void> _searchDoctors(String query) async {
    if (query.length < 2) { setState(() => searchResults = []); return; }
    setState(() => searching = true);
    try {
      final data = await ApiService.get('/auth/doctors/search?q=$query');
      setState(() => searchResults = List<Map<String, dynamic>>.from(data ?? []));
    } catch (_) { setState(() => searchResults = []); }
    setState(() => searching = false);
  }

  void _selectDoctor(Map<String, dynamic> doc) {
    setState(() {
      doctorCode = doc['doctorCode'] ?? '';
      doctorName = doc['name'] ?? '';
      doctorSpecialty = doc['specialty'] ?? '';
      hospital = doc['hospital'] ?? '';
      selectedDoctorId = doc['_id'];
      searchResults = [];
    });
  }

  Future<void> _generateEmergencyQR() async {
    try {
      final data = await ApiService.get('/access/emergency-qr');
      setState(() {
        emergencyQR = data['data'] is Map ? Map<String, dynamic>.from(data['data']) : null;
        showQR = true;
      });
    } catch (e) {
      _showError('Failed to generate QR: ${e.toString().replaceFirst("Exception: ", "")}');
    }
  }

  Future<void> _grantAccess() async {
    if (doctorName.isEmpty && !editMode) { _showError('Doctor name is required'); return; }
    setState(() => saving = true);
    try {
      final payload = {
        'doctorName': doctorName, 'doctorSpecialty': doctorSpecialty,
        'hospital': hospital, 'doctorCode': doctorCode, 'accessType': accessType,
        'allowMedicines': allowMedicines, 'allowedRecords': allowedRecords,
        if (selectedDoctorId != null) 'doctorId': selectedDoctorId,
      };
      if (editMode && editId != null) {
        await ApiService.put('/access/$editId/edit', payload);
      } else {
        await ApiService.post('/access/grant', payload);
      }
      setState(() { showForm = false; editMode = false; editId = null; doctorName = ''; doctorCode = ''; doctorSpecialty = ''; hospital = ''; selectedDoctorId = null; accessType = 'full'; allowMedicines = false; allowedRecords = []; });
      _fetchData();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('✅ Access saved!'), backgroundColor: Color(0xFF2E7D32)));
    } catch (e) { _showError('Failed: ${e.toString().replaceFirst("Exception: ", "")}'); }
    setState(() => saving = false);
  }

  Future<void> _toggleAccess(String id) async {
    try { await ApiService.put('/access/$id/toggle', {}); _fetchData(); } catch (_) {}
  }

  Future<void> _revokeAccess(String id) async {
    try { await ApiService.delete('/access/$id'); _fetchData(); } catch (_) {}
  }

  Future<void> _loadSlots(String docId, String date) async {
    try {
      final data = await ApiService.get('/appointments/doctor/$docId/slots?date=$date');
      setState(() => availableSlots = List<String>.from(data['slots'] ?? []));
    } catch (_) { setState(() => availableSlots = []); }
  }

  void _openBooking(String docId, Map<String, dynamic> fallback) {
    setState(() {
      bookingDoctor = {'_id': docId, ...fallback};
      bookingDate = ''; bookingSlot = ''; bookingType = 'online';
      availableSlots = []; showPayment = false; showForm = false;
    });
  }

  Future<void> _confirmBooking() async {
    if (bookingDoctor == null || bookingSlot.isEmpty) return;
    setState(() => saving = true);
    try {
      await ApiService.post('/appointments/book', {
        'doctorId': bookingDoctor!['_id'], 'date': bookingDate,
        'timeSlot': bookingSlot, 'type': bookingType,
        'amount': bookingDoctor!['consultationFee'] ?? 500,
        'transactionId': 'UPI_${DateTime.now().millisecondsSinceEpoch}',
      });
      setState(() { bookingDoctor = null; showPayment = false; });
      _fetchData();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('✅ Appointment booked!'), backgroundColor: Color(0xFF2E7D32)));
    } catch (e) { _showError(e.toString()); }
    setState(() => saving = false);
  }

  Future<void> _cancelAppointment(String id) async {
    setState(() => saving = true);
    try {
      await ApiService.post('/appointments/$id/cancel', {});
      _fetchData();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Appointment cancelled'), backgroundColor: Color(0xFF2E7D32)));
    } catch (e) { _showError(e.toString()); }
    setState(() => saving = false);
  }

  void _showError(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg.replaceFirst('Exception: ', '')), backgroundColor: AppColors.error, behavior: SnackBarBehavior.floating));
  }

  @override
  Widget build(BuildContext context) {
    final active = permissions.where((p) => p['isActive'] == true).toList();
    final scheduled = myAppointments.where((a) => a['status'] == 'scheduled').toList();

    return Scaffold(
      appBar: AppBar(
        title: Text('Access Control', style: GoogleFonts.manrope(fontSize: 20, fontWeight: FontWeight.w800)),
        actions: [
          IconButton(onPressed: () => setState(() { showForm = !showForm; editMode = false; bookingDoctor = null; }),
            icon: Icon(showForm ? Icons.close : Icons.person_add), tooltip: 'Grant Access'),
        ],
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.secondary))
          : RefreshIndicator(
              onRefresh: _fetchData,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  // Emergency QR
                  SizedBox(width: double.infinity, child: ElevatedButton.icon(
                    onPressed: _generateEmergencyQR, icon: const Icon(Icons.qr_code_2, size: 20),
                    label: const Text('🆘 Emergency QR Code'),
                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFD32F2F), foregroundColor: Colors.white, padding: const EdgeInsets.all(16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
                  )),
                  const SizedBox(height: 16),

                  if (showQR && emergencyQR != null) _buildQRCard(),
                  if (showForm) _buildGrantForm(),

                  // Booking modal
                  if (bookingDoctor != null) _buildBookingCard(),

                  // Appointments
                  if (scheduled.isNotEmpty && bookingDoctor == null && !showForm) ...[
                    Text('📅 Upcoming Consultations', style: GoogleFonts.manrope(fontSize: 16, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 10),
                    ...scheduled.map((apt) => _buildAppointmentCard(apt)),
                    const SizedBox(height: 20),
                  ],

                  // Active permissions
                  Text('🔓 Active Permissions (${active.length})', style: GoogleFonts.manrope(fontSize: 16, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 10),
                  if (active.isEmpty) Container(
                    width: double.infinity, padding: const EdgeInsets.all(32),
                    decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(20)),
                    child: Column(children: [
                      const Icon(Icons.shield_outlined, size: 48, color: AppColors.outline),
                      const SizedBox(height: 8),
                      Text('No active permissions', style: GoogleFonts.inter(color: AppColors.outline)),
                    ]),
                  ),
                  ...active.map((p) => _buildPermissionCard(p)),
                  const SizedBox(height: 20),
                ]),
              ),
            ),
    );
  }

  Widget _buildQRCard() => Container(
    width: double.infinity, padding: const EdgeInsets.all(24), margin: const EdgeInsets.only(bottom: 16),
    decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(24), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 30)]),
    child: Column(children: [
      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Text('Emergency QR', style: GoogleFonts.manrope(fontSize: 16, fontWeight: FontWeight.w700)),
        IconButton(icon: const Icon(Icons.close, size: 18), onPressed: () => setState(() => showQR = false)),
      ]),
      const SizedBox(height: 12),
      Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
        child: QrImageView(data: Uri.encodeComponent(_qrPayload()), size: 250, backgroundColor: Colors.white)),
      const SizedBox(height: 16),
      Container(width: double.infinity, padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: AppColors.surfaceContainerLow, borderRadius: BorderRadius.circular(12)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          _qrDetail('Name', emergencyQR!['name']), _qrDetail('Blood Group', emergencyQR!['bloodGroup']),
          _qrDetail('Health ID', emergencyQR!['healthId']),
          if (emergencyQR!['allergies'] != null && (emergencyQR!['allergies'] as List).isNotEmpty)
            _qrDetail('Allergies', (emergencyQR!['allergies'] as List).join(', ')),
        ])),
    ]),
  );

  Widget _buildGrantForm() => Container(
    margin: const EdgeInsets.only(bottom: 16), padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(24), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 20)]),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(editMode ? 'Edit Access Profile' : 'Grant Doctor Access', style: GoogleFonts.manrope(fontSize: 16, fontWeight: FontWeight.w700)),
      const SizedBox(height: 14),
      if (!editMode) ...[
        TextField(decoration: const InputDecoration(hintText: 'Search doctor by code or name', prefixIcon: Icon(Icons.search, size: 18)),
          onChanged: _searchDoctors),
        if (searching) const Padding(padding: EdgeInsets.all(8), child: Text('Searching...')),
      ],
      if (searchResults.isNotEmpty) Container(
        margin: const EdgeInsets.only(top: 4), constraints: const BoxConstraints(maxHeight: 200),
        decoration: BoxDecoration(color: AppColors.surfaceContainerLow, borderRadius: BorderRadius.circular(12)),
        child: ListView.builder(shrinkWrap: true, itemCount: searchResults.length, itemBuilder: (_, i) {
          final doc = searchResults[i];
          return ListTile(
            title: Text(doc['name'] ?? '', style: GoogleFonts.manrope(fontWeight: FontWeight.w600)),
            subtitle: Text('${doc['doctorCode'] ?? ''} • ${doc['specialty'] ?? ''} • ₹${doc['consultationFee'] ?? 500}', style: GoogleFonts.inter(fontSize: 12, color: AppColors.outline)),
            trailing: TextButton(onPressed: () => _openBooking(doc['_id'], doc), child: const Text('Book')),
            onTap: () => _selectDoctor(doc),
          );
        }),
      ),
      if (doctorName.isNotEmpty && searchResults.isEmpty && !editMode) ...[
        const SizedBox(height: 10),
        Text('Selected: $doctorName', style: GoogleFonts.inter(fontWeight: FontWeight.w600, color: AppColors.secondary)),
      ],
      const SizedBox(height: 10),
      DropdownButtonFormField<String>(
        value: ['full', 'limited', 'emergency', 'custom'].contains(accessType) ? accessType : 'full',
        decoration: const InputDecoration(prefixIcon: Icon(Icons.security, size: 18)),
        items: const [
          DropdownMenuItem(value: 'full', child: Text('Full Access')),
          DropdownMenuItem(value: 'limited', child: Text('Limited (Lab Reports Only)')),
          DropdownMenuItem(value: 'emergency', child: Text('Emergency Only')),
          DropdownMenuItem(value: 'custom', child: Text('Custom (Select Specific Records)')),
        ],
        onChanged: (v) => setState(() => accessType = v ?? 'full')),
      
      if (accessType == 'custom') ...[
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: AppColors.surfaceContainerLow, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.outlineVariant)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(child: Text('Select Specific Records', style: GoogleFonts.manrope(fontWeight: FontWeight.w600))),
              if (userRecords.isNotEmpty)
                SizedBox(width: 140, height: 32, child: TextField(
                  decoration: const InputDecoration(hintText: 'Search...', prefixIcon: Icon(Icons.search, size: 14), contentPadding: EdgeInsets.zero),
                  style: const TextStyle(fontSize: 12),
                  onChanged: (v) => setState(() => recordSearch = v),
                )),
            ]),
            const SizedBox(height: 12),
            if (userRecords.isEmpty)
              Text('No records found in your vault.', style: GoogleFonts.inter(fontSize: 13, color: AppColors.outline))
            else ...[
              CheckboxListTile(
                contentPadding: EdgeInsets.zero, dense: true,
                title: Text('💊 Include Active Prescriptions & Medications', style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFFF57F17), fontWeight: FontWeight.w600)),
                subtitle: Text('Allow this doctor to view your current pharmacy records', style: GoogleFonts.inter(fontSize: 11, color: AppColors.outline)),
                value: allowMedicines,
                onChanged: (v) => setState(() => allowMedicines = v ?? false),
                controlAffinity: ListTileControlAffinity.leading,
                activeColor: const Color(0xFFF57F17),
              ),
              const Divider(),
              ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 200),
                child: ListView(
                  shrinkWrap: true,
                  children: userRecords.where((r) => (r['title'] ?? '').toString().toLowerCase().contains(recordSearch.toLowerCase())).map((record) {
                    return CheckboxListTile(
                      contentPadding: EdgeInsets.zero, dense: true,
                      title: Text(record['title'] ?? 'Untitled', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w500)),
                      subtitle: Text(record['source'] == 'ai_ocr' ? '🧠 AI Parsed' : '', style: GoogleFonts.inter(fontSize: 10, color: AppColors.secondary)),
                      value: allowedRecords.contains(record['_id']),
                      onChanged: (v) {
                        setState(() {
                          if (v == true) allowedRecords.add(record['_id']);
                          else allowedRecords.remove(record['_id']);
                        });
                      },
                      controlAffinity: ListTileControlAffinity.leading,
                    );
                  }).toList(),
                ),
              ),
            ],
          ]),
        ),
      ],
      const SizedBox(height: 14),
      SizedBox(width: double.infinity, child: ElevatedButton(
        onPressed: saving ? null : _grantAccess,
        style: ElevatedButton.styleFrom(backgroundColor: AppColors.secondary, foregroundColor: Colors.white, padding: const EdgeInsets.all(14)),
        child: Text(saving ? 'Saving...' : (editMode ? 'Update Access' : 'Grant Access')),
      )),
    ]),
  );

  Widget _buildBookingCard() => Container(
    margin: const EdgeInsets.only(bottom: 16), padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(24), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 20)]),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Text(showPayment ? '💳 Complete Payment' : '📅 Book Appointment', style: GoogleFonts.manrope(fontSize: 16, fontWeight: FontWeight.w700)),
        IconButton(icon: const Icon(Icons.close), onPressed: () => setState(() { bookingDoctor = null; showPayment = false; })),
      ]),
      Container(padding: const EdgeInsets.all(12), margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(color: AppColors.surfaceContainerLow, borderRadius: BorderRadius.circular(12)),
        child: Row(children: [
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(bookingDoctor!['name'] ?? '', style: GoogleFonts.manrope(fontWeight: FontWeight.w700)),
            Text('${bookingDoctor!['specialty'] ?? ''} • ₹${bookingDoctor!['consultationFee'] ?? 500}', style: GoogleFonts.inter(fontSize: 12, color: AppColors.outline)),
          ])),
        ]),
      ),
      if (!showPayment) ...[
        DropdownButtonFormField<String>(initialValue: bookingType,
          decoration: const InputDecoration(labelText: 'Consultation Type'),
          items: const [
            DropdownMenuItem(value: 'online', child: Text('🌐 Online Video / Chat')),
            DropdownMenuItem(value: 'in-person', child: Text('🏥 In-Person')),
          ],
          onChanged: (v) => setState(() => bookingType = v ?? 'online')),
        const SizedBox(height: 10),
        InkWell(
          onTap: () async {
            final picked = await showDatePicker(context: context, firstDate: DateTime.now(), lastDate: DateTime.now().add(const Duration(days: 90)));
            if (picked != null) {
              final dateStr = '${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
              setState(() { bookingDate = dateStr; bookingSlot = ''; });
              _loadSlots(bookingDoctor!['_id'], dateStr);
            }
          },
          child: InputDecorator(
            decoration: const InputDecoration(labelText: 'Select Date', prefixIcon: Icon(Icons.calendar_today, size: 18)),
            child: Text(bookingDate.isEmpty ? 'Tap to pick date' : bookingDate),
          ),
        ),
        if (bookingDate.isNotEmpty) ...[
          const SizedBox(height: 12),
          Text('Available Slots', style: GoogleFonts.manrope(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          if (availableSlots.isEmpty) Text('No slots available for this date.', style: GoogleFonts.inter(fontSize: 13, color: AppColors.outline)),
          Wrap(spacing: 8, runSpacing: 8, children: availableSlots.map((slot) => ChoiceChip(
            label: Text(slot), selected: bookingSlot == slot,
            selectedColor: AppColors.primaryContainer, showCheckmark: false,
            onSelected: (_) => setState(() => bookingSlot = slot),
          )).toList()),
        ],
        const SizedBox(height: 16),
        SizedBox(width: double.infinity, child: ElevatedButton(
          onPressed: bookingSlot.isEmpty ? null : () => setState(() => showPayment = true),
          style: ElevatedButton.styleFrom(backgroundColor: AppColors.secondary, foregroundColor: Colors.white, padding: const EdgeInsets.all(16)),
          child: Text('💳 Pay ₹${bookingDoctor!['consultationFee'] ?? 500}'),
        )),
      ] else ...[
        Center(child: Column(children: [
          Text('Scan QR to pay via UPI', style: GoogleFonts.inter(color: AppColors.outline)),
          const SizedBox(height: 12),
          Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.outlineVariant)),
            child: QrImageView(data: 'upi://pay?pa=${bookingDoctor!['paymentUPI'] ?? 'doctor@ybl'}&am=${bookingDoctor!['consultationFee'] ?? 500}&cu=INR', size: 200, backgroundColor: Colors.white)),
          const SizedBox(height: 12),
          Text('₹${bookingDoctor!['consultationFee'] ?? 500}', style: GoogleFonts.manrope(fontSize: 24, fontWeight: FontWeight.w800)),
          const SizedBox(height: 16),
          Row(children: [
            Expanded(child: OutlinedButton(onPressed: () => setState(() => showPayment = false), child: const Text('Back'))),
            const SizedBox(width: 12),
            Expanded(flex: 2, child: ElevatedButton(
              onPressed: saving ? null : _confirmBooking,
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2E7D32), foregroundColor: Colors.white, padding: const EdgeInsets.all(16)),
              child: Text(saving ? 'Confirming...' : '✅ I Have Paid'),
            )),
          ]),
        ])),
      ],
    ]),
  );

  Widget _buildAppointmentCard(Map<String, dynamic> apt) {
    final doc = apt['doctor'] as Map<String, dynamic>? ?? {};
    return Container(
      margin: const EdgeInsets.only(bottom: 10), padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(20)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(doc['name'] ?? 'Doctor', style: GoogleFonts.manrope(fontSize: 15, fontWeight: FontWeight.w700)),
            Text('${apt['date']} at ${apt['timeSlot']}', style: GoogleFonts.inter(fontSize: 12, color: AppColors.outline)),
          ])),
          if (apt['status'] == 'scheduled') TextButton(
            onPressed: saving ? null : () => _cancelAppointment(apt['_id']),
            child: const Text('Cancel', style: TextStyle(color: AppColors.error, fontSize: 12))),
        ]),
        const SizedBox(height: 8),
        Wrap(spacing: 8, children: [
          _chip(apt['type'] == 'online' ? '🌐 Online' : '🏥 In-Person', apt['type'] == 'online' ? const Color(0xFF1565C0) : const Color(0xFFE65100)),
          _chip(apt['paymentStatus'] == 'paid' ? '💳 Paid' : '⏳ Pending', apt['paymentStatus'] == 'paid' ? const Color(0xFF2E7D32) : const Color(0xFFF57F17)),
        ]),
        if (apt['type'] == 'online' && apt['paymentStatus'] == 'paid' && apt['status'] == 'scheduled')
          Padding(padding: const EdgeInsets.only(top: 10), child: Row(children: [
            Expanded(child: OutlinedButton.icon(
              onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) =>
                ChatPage(partnerId: doc['_id'] ?? '', partnerName: doc['name'] ?? 'Doctor', partnerRole: 'doctor'))),
              icon: const Icon(Icons.chat, size: 16), label: const Text('Chat'))),
            const SizedBox(width: 8),
            Expanded(child: ElevatedButton.icon(
              onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) =>
                VideoCallPage(roomId: apt['_id'], title: 'Consultation with Dr. ${doc['name'] ?? ''}'))),
              icon: const Icon(Icons.videocam, size: 16), label: const Text('Video'),
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.secondary, foregroundColor: Colors.white))),
          ])),
      ]),
    );
  }

  Widget _buildPermissionCard(Map<String, dynamic> perm) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10), padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(20), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 15)]),
      child: Column(children: [
        Row(children: [
          CircleAvatar(backgroundColor: AppColors.secondaryContainer,
            child: Text(perm['doctorName']?.toString().isNotEmpty == true ? perm['doctorName'][0] : 'D',
              style: GoogleFonts.manrope(fontWeight: FontWeight.w700, color: AppColors.secondary))),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Text(perm['doctorName'] ?? 'Doctor', style: GoogleFonts.manrope(fontSize: 14, fontWeight: FontWeight.w700)),
              if (perm['doctorCode'] != null) Padding(padding: const EdgeInsets.only(left: 6),
                child: _chip(perm['doctorCode'], AppColors.secondary)),
            ]),
            Text('${perm['doctorSpecialty'] ?? ''} • ${perm['hospital'] ?? ''}', style: GoogleFonts.inter(fontSize: 12, color: AppColors.outline)),
          ])),
          Column(children: [
            IconButton(onPressed: () {
              setState(() {
                editMode = true;
                editId = perm['_id'];
                doctorName = perm['doctorName'] ?? '';
                doctorSpecialty = perm['doctorSpecialty'] ?? '';
                hospital = perm['hospital'] ?? '';
                doctorCode = perm['doctorCode'] ?? '';
                accessType = perm['accessType'] ?? 'full';
                allowMedicines = perm['allowMedicines'] ?? false;
                allowedRecords = List<String>.from(perm['allowedRecords'] ?? []);
                showForm = true;
                bookingDoctor = null;
              });
            }, icon: const Icon(Icons.edit, color: AppColors.primary), iconSize: 20),
            IconButton(onPressed: () => _toggleAccess(perm['_id']),
              icon: Icon(perm['isActive'] == true ? Icons.pause_circle : Icons.play_circle,
                color: perm['isActive'] == true ? const Color(0xFFF57F17) : const Color(0xFF2E7D32)), iconSize: 20),
            IconButton(onPressed: () => _revokeAccess(perm['_id']),
              icon: const Icon(Icons.delete, color: Colors.red), iconSize: 20),
          ]),
        ]),
        if (perm['isActive'] == true) Padding(
          padding: const EdgeInsets.only(top: 10),
          child: Row(children: [
            Expanded(child: OutlinedButton.icon(
              onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) =>
                ChatPage(partnerId: perm['doctor'] ?? perm['doctorId'] ?? '', partnerName: perm['doctorName'] ?? 'Doctor', partnerRole: 'doctor'))),
              icon: const Icon(Icons.chat, size: 14), label: const Text('Chat', style: TextStyle(fontSize: 12)))),
            const SizedBox(width: 8),
            Expanded(child: OutlinedButton.icon(
              onPressed: () => _openBooking(perm['doctor'] ?? perm['doctorId'] ?? '', {
                'name': perm['doctorName'], 'specialty': perm['doctorSpecialty'], 'hospital': perm['hospital'], 'consultationFee': 500,
              }),
              icon: const Icon(Icons.calendar_today, size: 14), label: const Text('Book', style: TextStyle(fontSize: 12)))),
          ]),
        ),
      ]),
    );
  }

  Widget _chip(String text, Color color) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(100)),
    child: Text(text, style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w600, color: color)),
  );

  Widget _qrDetail(String label, dynamic value) {
    if (value == null || value.toString().isEmpty) return const SizedBox.shrink();
    return Padding(padding: const EdgeInsets.symmetric(vertical: 3), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      SizedBox(width: 90, child: Text(label, style: GoogleFonts.inter(fontSize: 11, color: AppColors.outline, fontWeight: FontWeight.w600))),
      Expanded(child: Text(value.toString(), style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w500))),
    ]));
  }

  String _qrPayload() {
    if (emergencyQR == null) return '';
    return 'HealthVault Emergency|${emergencyQR!['healthId']}|${emergencyQR!['name']}|Blood:${emergencyQR!['bloodGroup']}';
  }
}
