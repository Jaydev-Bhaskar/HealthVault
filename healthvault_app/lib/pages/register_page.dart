import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../utils/constants.dart';

class RegisterPage extends StatefulWidget {
  const RegisterPage({super.key});
  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  String role = 'patient';
  bool loading = false;

  final _nameC = TextEditingController();
  final _emailC = TextEditingController();
  final _passwordC = TextEditingController();
  final _phoneC = TextEditingController();
  final _aadhaarC = TextEditingController();
  final _ageC = TextEditingController();
  String _bloodGroup = '';

  // Doctor fields
  final _specialtyC = TextEditingController();
  final _hospitalC = TextEditingController();
  final _licenseC = TextEditingController();

  // Hospital fields
  final _regNumberC = TextEditingController();
  final _addressC = TextEditingController();

  Future<void> _handleRegister() async {
    if (_nameC.text.isEmpty || _emailC.text.isEmpty || _passwordC.text.isEmpty) {
      _showError('Name, email, and password are required');
      return;
    }
    if (_passwordC.text.length < 6) {
      _showError('Password must be at least 6 characters');
      return;
    }
    setState(() => loading = true);
    try {
      final body = <String, dynamic>{
        'name': _nameC.text.trim(),
        'email': _emailC.text.trim(),
        'password': _passwordC.text,
        'phone': _phoneC.text.trim(),
        'aadhaarId': _aadhaarC.text.trim(),
        'role': role,
        'bloodGroup': _bloodGroup,
        'age': int.tryParse(_ageC.text) ?? 0,
      };
      if (role == 'doctor') {
        body['specialty'] = _specialtyC.text.trim();
        body['hospital'] = _hospitalC.text.trim();
        body['licenseNumber'] = _licenseC.text.trim();
      }
      if (role == 'hospital') {
        body['registrationNumber'] = _regNumberC.text.trim();
        body['address'] = _addressC.text.trim();
      }

      final data = await ApiService.post('/auth/register', body);
      if (mounted) {
        await context.read<AuthProvider>().loginWithData(Map<String, dynamic>.from(data));
        Navigator.pushReplacementNamed(context, '/dashboard');
      }
    } catch (e) {
      _showError(e.toString().replaceFirst('Exception: ', ''));
    }
    setState(() => loading = false);
  }

  void _showError(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(msg), backgroundColor: AppColors.error, behavior: SnackBarBehavior.floating));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 20),
              Center(
                child: Column(
                  children: [
                    Container(
                      width: 72, height: 72,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(colors: [AppColors.primary, AppColors.primaryDim]),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Icon(Icons.person_add, color: Colors.white, size: 36),
                    ),
                    const SizedBox(height: 16),
                    Text('Create Account', style: GoogleFonts.manrope(fontSize: 28, fontWeight: FontWeight.w800)),
                    const SizedBox(height: 4),
                    Text('Join HealthVault to secure your records', style: GoogleFonts.inter(color: AppColors.outline, fontSize: 14)),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Role toggle
              Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(color: AppColors.surfaceContainerHigh, borderRadius: BorderRadius.circular(14)),
                child: Row(
                  children: [
                    _roleButton('patient', '🏥 Patient'),
                    _roleButton('doctor', '🩺 Doctor'),
                    _roleButton('hospital', '🏢 Hospital'),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Form
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: AppColors.card,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 30, offset: const Offset(0, 10))],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _label('FULL NAME'),
                    TextField(controller: _nameC, decoration: const InputDecoration(hintText: 'Your full name', prefixIcon: Icon(Icons.person_outline, size: 18))),
                    const SizedBox(height: 14),
                    _label('EMAIL'),
                    TextField(controller: _emailC, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(hintText: 'your@email.com', prefixIcon: Icon(Icons.email_outlined, size: 18))),
                    const SizedBox(height: 14),
                    _label('PASSWORD'),
                    TextField(controller: _passwordC, obscureText: true, decoration: const InputDecoration(hintText: '••••••••', prefixIcon: Icon(Icons.lock_outline, size: 18))),
                    const SizedBox(height: 14),
                    _label('PHONE'),
                    TextField(controller: _phoneC, keyboardType: TextInputType.phone, decoration: const InputDecoration(hintText: '+91 9876543210', prefixIcon: Icon(Icons.phone_outlined, size: 18))),
                    const SizedBox(height: 14),

                    if (role == 'patient') ...[
                      _label('AADHAAR ID'),
                      TextField(controller: _aadhaarC, keyboardType: TextInputType.number, maxLength: 12, decoration: const InputDecoration(hintText: '12-digit Aadhaar', prefixIcon: Icon(Icons.credit_card, size: 18), counterText: '')),
                      const SizedBox(height: 14),
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _label('BLOOD GROUP'),
                                DropdownButtonFormField<String>(
                                  initialValue: _bloodGroup.isEmpty ? null : _bloodGroup,
                                  hint: const Text('Select'),
                                  items: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => DropdownMenuItem(value: bg, child: Text(bg))).toList(),
                                  onChanged: (v) => _bloodGroup = v ?? '',
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _label('AGE'),
                                TextField(controller: _ageC, keyboardType: TextInputType.number, decoration: const InputDecoration(hintText: 'Age')),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                    ],

                    if (role == 'doctor') ...[
                      _label('SPECIALTY'),
                      TextField(controller: _specialtyC, decoration: const InputDecoration(hintText: 'e.g. Cardiologist', prefixIcon: Icon(Icons.medical_services_outlined, size: 18))),
                      const SizedBox(height: 14),
                      _label('HOSPITAL'),
                      TextField(controller: _hospitalC, decoration: const InputDecoration(hintText: 'Hospital/Clinic name', prefixIcon: Icon(Icons.local_hospital_outlined, size: 18))),
                      const SizedBox(height: 14),
                      _label('LICENSE NUMBER'),
                      TextField(controller: _licenseC, decoration: const InputDecoration(hintText: 'Medical license #', prefixIcon: Icon(Icons.badge_outlined, size: 18))),
                      const SizedBox(height: 14),
                    ],

                    if (role == 'hospital') ...[
                      _label('REGISTRATION NUMBER'),
                      TextField(controller: _regNumberC, decoration: const InputDecoration(hintText: 'Hospital registration #', prefixIcon: Icon(Icons.assignment_outlined, size: 18))),
                      const SizedBox(height: 14),
                      _label('ADDRESS'),
                      TextField(controller: _addressC, maxLines: 2, decoration: const InputDecoration(hintText: 'Full address', prefixIcon: Icon(Icons.location_on_outlined, size: 18))),
                      const SizedBox(height: 14),
                    ],

                    const SizedBox(height: 6),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: loading ? null : _handleRegister,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.secondary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.all(16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        child: loading
                            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : Text('Create Account', style: GoogleFonts.manrope(fontWeight: FontWeight.w700)),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              Center(
                child: TextButton(
                  onPressed: () => Navigator.pushNamed(context, '/login'),
                  child: RichText(
                    text: TextSpan(
                      text: 'Already have an account? ',
                      style: GoogleFonts.inter(color: AppColors.outline, fontSize: 14),
                      children: [
                        TextSpan(
                          text: 'Sign In',
                          style: GoogleFonts.inter(color: AppColors.secondary, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _label(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(text, style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.onSurfaceVariant, letterSpacing: 0.5)),
    );
  }

  Widget _roleButton(String r, String label) {
    final active = role == r;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => role = r),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: active ? AppColors.primaryContainer : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Center(
            child: Text(label, style: GoogleFonts.inter(fontSize: 12, fontWeight: active ? FontWeight.w600 : FontWeight.w400, color: active ? AppColors.primary : AppColors.outline)),
          ),
        ),
      ),
    );
  }
}
