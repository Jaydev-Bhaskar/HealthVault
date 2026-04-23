import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../utils/constants.dart';

class RecordsPage extends StatefulWidget {
  const RecordsPage({super.key});
  @override
  State<RecordsPage> createState() => _RecordsPageState();
}

class _RecordsPageState extends State<RecordsPage> {
  List<Map<String, dynamic>> records = [];
  bool loading = true;
  bool uploading = false;
  String selectedFilter = 'all';
  Map<String, dynamic>? ocrResult;

  @override
  void initState() {
    super.initState();
    _fetchRecords();
  }

  Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token');
  }

  Future<void> _fetchRecords() async {
    setState(() => loading = true);
    try {
      final token = await _getToken();
      final res = await http.get(Uri.parse('$baseUrl/records'),
          headers: {'Authorization': 'Bearer $token'});
      if (res.statusCode == 200) {
        setState(() => records = List<Map<String, dynamic>>.from(json.decode(res.body)));
      }
    } catch (e) {
      _showError('Failed to load records: ${e.toString()}');
    }
    setState(() => loading = false);
  }

  Future<void> _scanDocument() async {
    final picker = ImagePicker();
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (_) => Container(
        padding: const EdgeInsets.all(24),
        decoration: const BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Select Source', style: GoogleFonts.manrope(fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 20),
            ListTile(
              leading: Container(
                width: 44, height: 44,
                decoration: BoxDecoration(color: AppColors.primaryContainer, borderRadius: BorderRadius.circular(12)),
                child: const Icon(Icons.camera_alt, color: AppColors.primary),
              ),
              title: const Text('Camera'),
              subtitle: const Text('Scan document with camera'),
              onTap: () => Navigator.pop(context, ImageSource.camera),
            ),
            const Divider(),
            ListTile(
              leading: Container(
                width: 44, height: 44,
                decoration: BoxDecoration(color: AppColors.secondaryContainer, borderRadius: BorderRadius.circular(12)),
                child: const Icon(Icons.photo_library, color: AppColors.secondary),
              ),
              title: const Text('Gallery'),
              subtitle: const Text('Upload from gallery'),
              onTap: () => Navigator.pop(context, ImageSource.gallery),
            ),
          ],
        ),
      ),
    );
    if (source == null) return;

    final image = await picker.pickImage(source: source, imageQuality: 85);
    if (image == null) return;

    setState(() => uploading = true);
    try {
      final token = await _getToken();
      final request = http.MultipartRequest('POST', Uri.parse('$baseUrl/ai/ocr-scan'));
      request.headers['Authorization'] = 'Bearer $token';
      request.files.add(await http.MultipartFile.fromPath('file', image.path));
      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        setState(() => ocrResult = data);
        _fetchRecords();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('✅ ${data['message'] ?? 'Document processed!'}\n${data['medicinesCreated'] != null && data['medicinesCreated'] > 0 ? '💊 ${data["medicinesCreated"]} medicines auto-added' : ''}'),
              backgroundColor: const Color(0xFF2E7D32),
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              duration: const Duration(seconds: 4),
            ),
          );
        }
      } else {
        final err = json.decode(response.body);
        _showError(err['message'] ?? 'Upload failed');
      }
    } catch (e) {
      _showError('Upload failed: $e');
    }
    setState(() => uploading = false);
  }

  Future<void> _deleteRecord(String id) async {
    try {
      final token = await _getToken();
      final res = await http.delete(Uri.parse('$baseUrl/records/$id'),
          headers: {'Authorization': 'Bearer $token'});
      if (res.statusCode == 200) {
        _fetchRecords();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Record deleted'), backgroundColor: Color(0xFF2E7D32)),
          );
        }
      }
    } catch (e) {
      _showError('Delete failed: $e');
    }
  }

  void _showError(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: AppColors.error, behavior: SnackBarBehavior.floating),
    );
  }

  List<Map<String, dynamic>> get filteredRecords {
    if (selectedFilter == 'all') return records;
    return records.where((r) => r['type'] == selectedFilter).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Health Records', style: GoogleFonts.manrope(fontSize: 20, fontWeight: FontWeight.w800)),
        actions: [
          if (uploading)
            const Padding(
              padding: EdgeInsets.all(12),
              child: SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2)),
            )
          else
            IconButton(onPressed: _scanDocument, icon: const Icon(Icons.document_scanner, color: AppColors.secondary)),
        ],
      ),
      body: Column(
        children: [
          // Filter bar
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: ['all', 'lab_report', 'prescription', 'scan', 'vaccination', 'other']
                  .map((f) => Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(_filterLabel(f)),
                          selected: selectedFilter == f,
                          onSelected: (_) => setState(() => selectedFilter = f),
                          selectedColor: AppColors.primaryContainer,
                          labelStyle: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: selectedFilter == f ? FontWeight.w600 : FontWeight.w400,
                            color: selectedFilter == f ? AppColors.primary : AppColors.onSurfaceVariant,
                          ),
                          showCheckmark: false,
                          backgroundColor: AppColors.surfaceContainerHigh,
                        ),
                      ))
                  .toList(),
            ),
          ),

          // OCR Result Banner
          if (ocrResult != null && ocrResult!['extractedData'] != null)
            _buildOcrBanner(),

          // Records list
          Expanded(
            child: loading
                ? const Center(child: CircularProgressIndicator(color: AppColors.secondary))
                : filteredRecords.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.folder_off_outlined, size: 64, color: AppColors.outline),
                            const SizedBox(height: 12),
                            Text('No records found', style: GoogleFonts.manrope(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.outline)),
                            const SizedBox(height: 8),
                            ElevatedButton.icon(
                              onPressed: _scanDocument,
                              icon: const Icon(Icons.document_scanner, size: 18),
                              label: const Text('Scan First Document'),
                              style: ElevatedButton.styleFrom(backgroundColor: AppColors.secondary, foregroundColor: Colors.white),
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _fetchRecords,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: filteredRecords.length,
                          itemBuilder: (_, i) => _buildRecordCard(filteredRecords[i]),
                        ),
                      ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _scanDocument,
        backgroundColor: AppColors.secondary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.document_scanner),
        label: const Text('AI Scan'),
      ),
    );
  }

  Widget _buildOcrBanner() {
    final data = ocrResult!['extractedData'];
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF0FFF0),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF2E7D32).withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.auto_awesome, color: Color(0xFF2E7D32), size: 18),
              const SizedBox(width: 8),
              Expanded(child: Text('AI Scan Result', style: GoogleFonts.manrope(fontSize: 14, fontWeight: FontWeight.w700, color: const Color(0xFF2E7D32)))),
              IconButton(icon: const Icon(Icons.close, size: 18), onPressed: () => setState(() => ocrResult = null)),
            ],
          ),
          const SizedBox(height: 6),
          if (data['title'] != null) Text(data['title'], style: GoogleFonts.manrope(fontSize: 15, fontWeight: FontWeight.w700)),
          if (data['summary'] != null) ...[
            const SizedBox(height: 4),
            Text(data['summary'], style: GoogleFonts.inter(fontSize: 12, color: AppColors.onSurfaceVariant, height: 1.4)),
          ],
          if (data['doctorName'] != null) ...[
            const SizedBox(height: 4),
            Text('Doctor: ${data['doctorName']}', style: GoogleFonts.inter(fontSize: 12, color: AppColors.outline)),
          ],
          if (ocrResult!['aiWarning'] != null) ...[
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: const Color(0xFFFFF3E0), borderRadius: BorderRadius.circular(8)),
              child: Text('⚠️ ${ocrResult!['aiWarning']}', style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFFE65100))),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildRecordCard(Map<String, dynamic> record) {
    final typeIcons = {
      'lab_report': Icons.science,
      'prescription': Icons.medication,
      'scan': Icons.medical_information,
      'vaccination': Icons.vaccines,
      'fitness': Icons.fitness_center,
      'other': Icons.description,
    };
    final type = record['type'] ?? 'other';
    final aiData = record['aiParsedData'] as Map<String, dynamic>?;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 15, offset: const Offset(0, 4))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40, height: 40,
                decoration: BoxDecoration(
                  color: AppColors.primaryContainer.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(typeIcons[type] ?? Icons.description, color: AppColors.primary, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(record['title'] ?? 'Untitled', style: GoogleFonts.manrope(fontSize: 14, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(color: AppColors.surfaceContainerHigh, borderRadius: BorderRadius.circular(100)),
                          child: Text(_filterLabel(type), style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w500, color: AppColors.outline)),
                        ),
                        if (record['source'] == 'ai_ocr') ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(color: AppColors.secondaryContainer, borderRadius: BorderRadius.circular(100)),
                            child: Text('AI Parsed', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.secondary)),
                          ),
                        ],
                        if (record['isVerified'] == true) ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(color: const Color(0xFFE8F5E9), borderRadius: BorderRadius.circular(100)),
                            child: Text('✓ Verified', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w600, color: const Color(0xFF2E7D32))),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              PopupMenuButton(
                icon: const Icon(Icons.more_vert, size: 18),
                onSelected: (val) {
                  if (val == 'delete') _deleteRecord(record['_id']);
                },
                itemBuilder: (_) => const [
                  PopupMenuItem(value: 'delete', child: Row(children: [Icon(Icons.delete, size: 18, color: Colors.red), SizedBox(width: 8), Text('Delete')])),
                ],
              ),
            ],
          ),
          if (record['description'] != null && record['description'].isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(record['description'], style: GoogleFonts.inter(fontSize: 13, color: AppColors.onSurfaceVariant, height: 1.5), maxLines: 3, overflow: TextOverflow.ellipsis),
          ],
          // Show AI parsed key metrics
          if (aiData?['keyMetrics'] != null && (aiData!['keyMetrics'] as List).isNotEmpty) ...[
            const SizedBox(height: 10),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: (aiData['keyMetrics'] as List).map<Widget>((m) {
                final statusColor = m['status'] == 'high' ? Colors.red : m['status'] == 'low' ? Colors.orange : const Color(0xFF2E7D32);
                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(color: statusColor.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(10)),
                  child: Text('${m['name']}: ${m['value']} ${m['unit'] ?? ''}',
                      style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w500, color: statusColor)),
                );
              }).toList(),
            ),
          ],
          // Date
          const SizedBox(height: 8),
          Text(
            _formatDate(record['uploadedAt'] ?? record['createdAt']),
            style: GoogleFonts.inter(fontSize: 11, color: AppColors.outline),
          ),
        ],
      ),
    );
  }

  String _filterLabel(String type) {
    switch (type) {
      case 'all': return 'All';
      case 'lab_report': return 'Lab Report';
      case 'prescription': return 'Prescription';
      case 'scan': return 'Scan/MRI';
      case 'vaccination': return 'Vaccination';
      case 'fitness': return 'Fitness';
      case 'other': return 'Other';
      default: return type;
    }
  }

  String _formatDate(dynamic dateStr) {
    if (dateStr == null) return '';
    try {
      final d = DateTime.parse(dateStr.toString());
      final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return '${months[d.month - 1]} ${d.day}, ${d.year}';
    } catch (_) {
      return dateStr.toString();
    }
  }
}
