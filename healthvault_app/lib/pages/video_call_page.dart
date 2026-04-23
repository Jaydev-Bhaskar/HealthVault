import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import '../utils/constants.dart';

class VideoCallPage extends StatelessWidget {
  final String roomId;
  final String title;

  const VideoCallPage({super.key, required this.roomId, required this.title});

  Future<void> _launchJitsi(BuildContext context) async {
    final url = Uri.parse('https://meet.jit.si/HealthVaultConsultation_$roomId');
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    } else {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not launch video call'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Video Consultation', style: GoogleFonts.manrope(fontSize: 20, fontWeight: FontWeight.w800)),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 100, height: 100,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [AppColors.secondary, AppColors.tertiary]),
                  borderRadius: BorderRadius.circular(30),
                ),
                child: const Icon(Icons.videocam, color: Colors.white, size: 48),
              ),
              const SizedBox(height: 24),
              Text(title, style: GoogleFonts.manrope(fontSize: 20, fontWeight: FontWeight.w700), textAlign: TextAlign.center),
              const SizedBox(height: 8),
              Text(
                'This will open a secure Jitsi Meet video room in your browser',
                style: GoogleFonts.inter(fontSize: 14, color: AppColors.outline, height: 1.5),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => _launchJitsi(context),
                  icon: const Icon(Icons.video_call, size: 22),
                  label: const Text('Join Video Call'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.secondary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.all(18),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.surfaceContainerLow,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline, size: 16, color: AppColors.outline),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Room: HealthVaultConsultation_$roomId',
                        style: GoogleFonts.inter(fontSize: 11, color: AppColors.outline),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
