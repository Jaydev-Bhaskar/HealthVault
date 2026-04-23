import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../utils/constants.dart';

class AboutPage extends StatelessWidget {
  const AboutPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('About HealthVault', style: GoogleFonts.manrope(fontSize: 20, fontWeight: FontWeight.w800)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Hero image
            ClipRRect(
              borderRadius: BorderRadius.circular(24),
              child: Image.network(
                'https://images.unsplash.com/photo-1581056771107-24ca5f033842?auto=format&fit=crop&q=80&w=800',
                height: 200,
                width: double.infinity,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
                  height: 200,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(24),
                    color: AppColors.surfaceContainerHigh,
                  ),
                  child: const Center(child: Icon(Icons.medical_services, size: 80, color: AppColors.outline)),
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Mission
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
                  Text('Our Mission', style: GoogleFonts.manrope(fontSize: 22, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 12),
                  Text(
                    'At HealthVault, we believe that every individual should have absolute ownership of their medical history. '
                    'The current healthcare system is fragmented, with data siloed across multiple institutions. '
                    'Our mission is to unify these records into a secure, patient-centric ecosystem.',
                    style: GoogleFonts.inter(fontSize: 14, height: 1.7, color: AppColors.onSurfaceVariant),
                  ),
                  const SizedBox(height: 20),
                  Text('How It Works', style: GoogleFonts.manrope(fontSize: 22, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 12),
                  Text(
                    'By leveraging blockchain technology, we create an immutable audit trail of your health records. '
                    'When a doctor adds a prescription or a lab uploads a report, it\'s cryptographically signed and '
                    'stored. Only you, the patient, hold the keys to unlock and share this information.',
                    style: GoogleFonts.inter(fontSize: 14, height: 1.7, color: AppColors.onSurfaceVariant),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Values
            _valueCard('🛡️', 'Integrity', 'We ensure data remains untampered and authentic at all times.'),
            const SizedBox(height: 12),
            _valueCard('🌐', 'Accessibility', 'Your records are available to you anywhere in the world, 24/7.'),
            const SizedBox(height: 12),
            _valueCard('🚀', 'Innovation', 'Constantly integrating the latest in AI and Web3 to improve care.'),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _valueCard(String icon, String title, String desc) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 20, offset: const Offset(0, 6))],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(icon, style: const TextStyle(fontSize: 32)),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: GoogleFonts.manrope(fontSize: 16, fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text(desc, style: GoogleFonts.inter(fontSize: 13, color: AppColors.outline, height: 1.5)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
