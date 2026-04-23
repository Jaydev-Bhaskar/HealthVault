import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../utils/constants.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});
  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  bool isAadhaar = false;
  bool otpSent = false;
  bool loading = false;
  String? demoOtp;

  final _emailC = TextEditingController();
  final _passwordC = TextEditingController();
  final _aadhaarC = TextEditingController();
  final _otpC = TextEditingController();

  Future<void> _handleEmailLogin() async {
    if (_emailC.text.isEmpty || _passwordC.text.isEmpty) {
      _showError('Please fill all fields');
      return;
    }
    setState(() => loading = true);
    try {
      final data = await ApiService.post('/auth/login', {
        'email': _emailC.text.trim(),
        'password': _passwordC.text,
      });
      if (mounted) {
        await context.read<AuthProvider>().loginWithData(Map<String, dynamic>.from(data));
        final role = data['user']?['role'] ?? 'patient';
        if (role == 'doctor') {
          Navigator.pushReplacementNamed(context, '/doctor-dashboard');
        } else if (role == 'hospital') {
          Navigator.pushReplacementNamed(context, '/hospital-dashboard');
        } else {
          Navigator.pushReplacementNamed(context, '/dashboard');
        }
      }
    } catch (e) {
      _showError(e.toString().replaceFirst('Exception: ', ''));
    }
    setState(() => loading = false);
  }

  Future<void> _sendOtp() async {
    if (_aadhaarC.text.length != 12) {
      _showError('Aadhaar must be 12 digits');
      return;
    }
    setState(() => loading = true);
    try {
      final data = await ApiService.post('/auth/aadhaar/send-otp', {
        'aadhaarId': _aadhaarC.text.trim(),
      });
      setState(() {
        otpSent = true;
        demoOtp = data['demoOtp']?.toString();
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('OTP sent! ${demoOtp != null ? "(Demo OTP: $demoOtp)" : ""}'),
            backgroundColor: const Color(0xFF2E7D32),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      _showError(e.toString().replaceFirst('Exception: ', ''));
    }
    setState(() => loading = false);
  }

  Future<void> _verifyOtp() async {
    if (_otpC.text.length != 6) {
      _showError('OTP must be 6 digits');
      return;
    }
    setState(() => loading = true);
    try {
      final data = await ApiService.post('/auth/aadhaar/verify-otp', {
        'aadhaarId': _aadhaarC.text.trim(),
        'otp': _otpC.text.trim(),
      });
      if (mounted) {
        await context.read<AuthProvider>().loginWithData(Map<String, dynamic>.from(data));
        final role = data['user']?['role'] ?? 'patient';
        if (role == 'doctor') {
          Navigator.pushReplacementNamed(context, '/doctor-dashboard');
        } else if (role == 'hospital') {
          Navigator.pushReplacementNamed(context, '/hospital-dashboard');
        } else {
          Navigator.pushReplacementNamed(context, '/dashboard');
        }
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
              const SizedBox(height: 40),
              // Logo
              Center(
                child: Column(
                  children: [
                    Container(
                      width: 72, height: 72,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(colors: [AppColors.secondary, AppColors.tertiary]),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Icon(Icons.health_and_safety, color: Colors.white, size: 36),
                    ),
                    const SizedBox(height: 16),
                    Text('Welcome Back', style: GoogleFonts.manrope(fontSize: 28, fontWeight: FontWeight.w800)),
                    const SizedBox(height: 4),
                    Text('Sign in to access your health vault', style: GoogleFonts.inter(color: AppColors.outline, fontSize: 14)),
                  ],
                ),
              ),
              const SizedBox(height: 32),

              // Login method toggle
              Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(color: AppColors.surfaceContainerHigh, borderRadius: BorderRadius.circular(14)),
                child: Row(
                  children: [
                    _toggleButton('Email', !isAadhaar, () => setState(() { isAadhaar = false; otpSent = false; })),
                    _toggleButton('Aadhaar OTP', isAadhaar, () => setState(() { isAadhaar = true; otpSent = false; })),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Login form
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: AppColors.card,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 30, offset: const Offset(0, 10))],
                ),
                child: isAadhaar ? _buildAadhaarForm() : _buildEmailForm(),
              ),
              const SizedBox(height: 24),

              // Register link
              Center(
                child: TextButton(
                  onPressed: () => Navigator.pushNamed(context, '/register'),
                  child: RichText(
                    text: TextSpan(
                      text: "Don't have an account? ",
                      style: GoogleFonts.inter(color: AppColors.outline, fontSize: 14),
                      children: [
                        TextSpan(
                          text: 'Register',
                          style: GoogleFonts.inter(color: AppColors.secondary, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmailForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('EMAIL', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.onSurfaceVariant, letterSpacing: 0.5)),
        const SizedBox(height: 6),
        TextField(controller: _emailC, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(hintText: 'your@email.com', prefixIcon: Icon(Icons.email_outlined, size: 18))),
        const SizedBox(height: 16),
        Text('PASSWORD', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.onSurfaceVariant, letterSpacing: 0.5)),
        const SizedBox(height: 6),
        TextField(controller: _passwordC, obscureText: true, decoration: const InputDecoration(hintText: '••••••••', prefixIcon: Icon(Icons.lock_outline, size: 18))),
        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: loading ? null : _handleEmailLogin,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.secondary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.all(16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
            child: loading
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : Text('Sign In', style: GoogleFonts.manrope(fontWeight: FontWeight.w700)),
          ),
        ),
      ],
    );
  }

  Widget _buildAadhaarForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('AADHAAR NUMBER', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.onSurfaceVariant, letterSpacing: 0.5)),
        const SizedBox(height: 6),
        TextField(
          controller: _aadhaarC,
          keyboardType: TextInputType.number,
          maxLength: 12,
          enabled: !otpSent,
          decoration: const InputDecoration(hintText: '12-digit Aadhaar number', prefixIcon: Icon(Icons.credit_card, size: 18), counterText: ''),
        ),
        if (otpSent) ...[
          const SizedBox(height: 16),
          Text('ENTER OTP', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.onSurfaceVariant, letterSpacing: 0.5)),
          const SizedBox(height: 6),
          TextField(
            controller: _otpC,
            keyboardType: TextInputType.number,
            maxLength: 6,
            decoration: InputDecoration(
              hintText: '6-digit OTP',
              prefixIcon: const Icon(Icons.key, size: 18),
              counterText: '',
              helperText: demoOtp != null ? 'Demo OTP: $demoOtp' : null,
              helperStyle: GoogleFonts.inter(color: AppColors.secondary, fontWeight: FontWeight.w600),
            ),
          ),
        ],
        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: loading ? null : (otpSent ? _verifyOtp : _sendOtp),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.secondary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.all(16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
            child: loading
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : Text(otpSent ? 'Verify & Sign In' : 'Send OTP', style: GoogleFonts.manrope(fontWeight: FontWeight.w700)),
          ),
        ),
        if (otpSent) ...[
          const SizedBox(height: 10),
          Center(
            child: TextButton(
              onPressed: () => setState(() { otpSent = false; _otpC.clear(); demoOtp = null; }),
              child: Text('Change Aadhaar Number', style: GoogleFonts.inter(color: AppColors.secondary, fontSize: 13)),
            ),
          ),
        ],
      ],
    );
  }

  Widget _toggleButton(String label, bool active, VoidCallback onTap) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: active ? AppColors.primaryContainer : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Center(
            child: Text(label, style: GoogleFonts.inter(fontSize: 13, fontWeight: active ? FontWeight.w600 : FontWeight.w400, color: active ? AppColors.primary : AppColors.outline)),
          ),
        ),
      ),
    );
  }
}
