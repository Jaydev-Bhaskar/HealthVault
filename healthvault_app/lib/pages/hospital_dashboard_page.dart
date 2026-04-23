import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../services/api_service.dart';
import '../utils/constants.dart';
import 'qr_scanner_page.dart';

class HospitalDashboardPage extends StatefulWidget {
  const HospitalDashboardPage({super.key});
  @override
  State<HospitalDashboardPage> createState() => _HospitalDashboardPageState();
}

class _HospitalDashboardPageState extends State<HospitalDashboardPage> {
  final _searchC = TextEditingController();
  final _titleC = TextEditingController();
  final _descC = TextEditingController();
  Map<String, dynamic>? patient;
  String searchError = '';
  String uploadType = 'lab_report';
  bool uploading = false;
  String uploadMsg = '';
  List<Map<String, String>> recentUploads = [];

  Future<void> _searchPatient() async {
    if (_searchC.text.trim().isEmpty) return;
    setState(() { searchError = ''; patient = null; });
    try {
      final data = await ApiService.get('/auth/patient/search?q=${_searchC.text.trim()}');
      if (data != null) {
        setState(() => patient = Map<String, dynamic>.from(data));
      } else {
        setState(() => searchError = 'No patient found with that Health ID.');
      }
    } catch (e) {
      setState(() => searchError = e.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<void> _uploadReport() async {
    if (patient == null || _titleC.text.isEmpty) return;
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.gallery, imageQuality: 85);

    setState(() { uploading = true; uploadMsg = ''; });
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token');
      final userData = prefs.getString('user');
      final user = userData != null ? json.decode(userData) : {};

      final request = http.MultipartRequest('POST', Uri.parse('$baseUrl/records/hospital-upload'));
      request.headers['Authorization'] = 'Bearer $token';
      request.fields['title'] = _titleC.text;
      request.fields['type'] = uploadType;
      request.fields['description'] = _descC.text;
      request.fields['patientHealthId'] = patient!['healthId'] ?? '';
      request.fields['uploadedBy'] = user['name'] ?? '';
      request.fields['uploadedByCode'] = user['labCode'] ?? '';
      if (image != null) {
        request.files.add(await http.MultipartFile.fromPath('file', image.path));
      }

      final streamRes = await request.send();
      final res = await http.Response.fromStream(streamRes);
      if (res.statusCode == 200 || res.statusCode == 201) {
        setState(() {
          uploadMsg = '✅ Report uploaded to ${patient!['name']}\'s vault!';
          recentUploads.insert(0, {'title': _titleC.text, 'type': uploadType, 'patient': patient!['name'] ?? '', 'time': DateTime.now().toString().substring(0, 16)});
          _titleC.clear();
          _descC.clear();
        });
      } else {
        final err = json.decode(res.body);
        setState(() => uploadMsg = '❌ ${err['message'] ?? 'Upload failed'}');
      }
    } catch (e) {
      setState(() => uploadMsg = '❌ Upload failed: $e');
    }
    setState(() => uploading = false);
  }

  Future<void> _scanPatientQR() async {
    final result = await Navigator.push(context, MaterialPageRoute(builder: (_) => const QRScannerPage(title: 'Scan Patient QR')));
    if (result != null && result is Map && result['healthId'] != null) {
      _searchC.text = result['healthId'];
      _searchPatient();
    }
  }


  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('🏥 Hospital Portal', style: GoogleFonts.manrope(fontSize: 20, fontWeight: FontWeight.w800)),
        actions: [
          IconButton(onPressed: _scanPatientQR, icon: const Icon(Icons.qr_code_scanner), tooltip: 'Scan Patient QR'),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // Search
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(20)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('🔍 Find Patient by Health ID', style: GoogleFonts.manrope(fontSize: 16, fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              Row(children: [
                Expanded(child: TextField(
                  controller: _searchC,
                  decoration: const InputDecoration(hintText: 'Enter Health ID (e.g., HV-M2X9K7PL)', prefixIcon: Icon(Icons.search, size: 18)),
                  onSubmitted: (_) => _searchPatient(),
                )),
                const SizedBox(width: 8),
                ElevatedButton(onPressed: _searchPatient,
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.secondary, foregroundColor: Colors.white, padding: const EdgeInsets.all(14)),
                  child: const Text('Search')),
              ]),
              if (searchError.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 10),
                child: Text(searchError, style: GoogleFonts.inter(color: AppColors.error))),
              if (patient != null) Container(
                margin: const EdgeInsets.only(top: 14), padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(color: AppColors.surfaceContainerLow, borderRadius: BorderRadius.circular(14)),
                child: Row(children: [
                  CircleAvatar(backgroundColor: AppColors.secondaryContainer,
                    child: Text(patient!['name']?[0] ?? '?', style: GoogleFonts.manrope(fontWeight: FontWeight.w700, color: AppColors.secondary))),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(patient!['name'] ?? '', style: GoogleFonts.manrope(fontSize: 15, fontWeight: FontWeight.w700)),
                    Text('${patient!['healthId']} • ${patient!['bloodGroup'] ?? ''} • Age: ${patient!['age'] ?? 'N/A'}',
                      style: GoogleFonts.inter(fontSize: 12, color: AppColors.outline)),
                  ])),
                  Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(color: const Color(0xFFE8F5E9), borderRadius: BorderRadius.circular(100)),
                    child: Text('✅ Verified', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w600, color: const Color(0xFF2E7D32)))),
                ]),
              ),
            ]),
          ),

          // Upload form
          if (patient != null) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(20)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('📄 Upload Report to ${patient!['name']}\'s Vault',
                  style: GoogleFonts.manrope(fontSize: 16, fontWeight: FontWeight.w700)),
                const SizedBox(height: 14),
                TextField(controller: _titleC, decoration: const InputDecoration(hintText: 'Report Title *', prefixIcon: Icon(Icons.title, size: 18))),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  initialValue: uploadType,
                  decoration: const InputDecoration(prefixIcon: Icon(Icons.category, size: 18)),
                  items: const [
                    DropdownMenuItem(value: 'lab_report', child: Text('Lab Report')),
                    DropdownMenuItem(value: 'scan', child: Text('Scan / Imaging')),
                    DropdownMenuItem(value: 'prescription', child: Text('Prescription')),
                    DropdownMenuItem(value: 'vaccination', child: Text('Vaccination')),
                    DropdownMenuItem(value: 'other', child: Text('Other')),
                  ],
                  onChanged: (v) => setState(() => uploadType = v ?? 'lab_report'),
                ),
                const SizedBox(height: 10),
                TextField(controller: _descC, decoration: const InputDecoration(hintText: 'Description / Notes'), maxLines: 3),
                const SizedBox(height: 14),
                SizedBox(width: double.infinity, child: ElevatedButton.icon(
                  onPressed: uploading ? null : _uploadReport,
                  icon: uploading ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.upload),
                  label: Text(uploading ? 'Uploading...' : 'Upload Report'),
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.secondary, foregroundColor: Colors.white, padding: const EdgeInsets.all(16)),
                )),
                if (uploadMsg.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 10),
                  child: Text(uploadMsg, style: GoogleFonts.inter(fontWeight: FontWeight.w600,
                    color: uploadMsg.startsWith('✅') ? const Color(0xFF2E7D32) : AppColors.error))),
              ]),
            ),
          ],

          // Recent uploads
          if (recentUploads.isNotEmpty) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(20)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('📋 Recent Uploads', style: GoogleFonts.manrope(fontSize: 16, fontWeight: FontWeight.w700)),
                const SizedBox(height: 10),
                ...recentUploads.map((up) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Row(children: [
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(up['title'] ?? '', style: GoogleFonts.manrope(fontSize: 13, fontWeight: FontWeight.w600)),
                      Text('For: ${up['patient']} • ${up['type']?.replaceAll('_', ' ')}',
                        style: GoogleFonts.inter(fontSize: 11, color: AppColors.outline)),
                    ])),
                    Text(up['time'] ?? '', style: GoogleFonts.inter(fontSize: 10, color: AppColors.outline)),
                  ]),
                )),
              ]),
            ),
          ],
        ]),
      ),
    );
  }
}
