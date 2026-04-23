import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'providers/auth_provider.dart';
import 'utils/constants.dart';
import 'pages/home_page.dart';
import 'pages/login_page.dart';
import 'pages/register_page.dart';
import 'pages/dashboard_page.dart';
import 'pages/doctor_dashboard_page.dart';
import 'pages/hospital_dashboard_page.dart';
import 'pages/records_page.dart';
import 'pages/medicines_page.dart';
import 'pages/family_vault_page.dart';
import 'pages/access_control_page.dart';
import 'pages/blockchain_ledger_page.dart';
import 'pages/about_page.dart';
import 'pages/contact_page.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    ChangeNotifierProvider(
      create: (_) => AuthProvider(),
      child: const HealthVaultApp(),
    ),
  );
}

class HealthVaultApp extends StatelessWidget {
  const HealthVaultApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'HealthVault AI',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.theme,
      home: const _SplashScreen(),
      routes: {
        '/home': (_) => const HomePage(),
        '/login': (_) => const LoginPage(),
        '/register': (_) => const RegisterPage(),
        '/dashboard': (_) => const _AuthGuard(child: DashboardPage()),
        '/doctor-dashboard': (_) => const _AuthGuard(child: DoctorDashboardPage()),
        '/hospital-dashboard': (_) => const _AuthGuard(child: HospitalDashboardPage()),
        '/records': (_) => const _AuthGuard(child: RecordsPage()),
        '/medicines': (_) => const _AuthGuard(child: MedicinesPage()),
        '/family': (_) => const _AuthGuard(child: FamilyVaultPage()),
        '/access': (_) => const _AuthGuard(child: AccessControlPage()),
        '/blockchain': (_) => const _AuthGuard(child: BlockchainLedgerPage()),
        '/about': (_) => const AboutPage(),
        '/contact': (_) => const ContactPage(),
      },
    );
  }
}

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, auth, _) {
        if (auth.loading) {
          return Scaffold(
            backgroundColor: AppColors.surface,
            body: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(colors: [AppColors.secondary, AppColors.tertiary]),
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: const Icon(Icons.health_and_safety, color: Colors.white, size: 42),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'HealthVault',
                    style: GoogleFonts.manrope(fontSize: 32, fontWeight: FontWeight.w800, color: AppColors.secondary),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Securing Your Health Future',
                    style: GoogleFonts.inter(fontSize: 14, color: AppColors.outline),
                  ),
                  const SizedBox(height: 32),
                  const SizedBox(
                    width: 32, height: 32,
                    child: CircularProgressIndicator(color: AppColors.primaryContainer, strokeWidth: 3),
                  ),
                ],
              ),
            ),
          );
        }
        if (auth.isLoggedIn) {
          // Role-based routing
          final role = auth.user?['role'] ?? 'patient';
          if (role == 'doctor') return const DoctorDashboardPage();
          if (role == 'hospital') return const HospitalDashboardPage();
          return const DashboardPage();
        }
        return const HomePage();
      },
    );
  }
}

class _AuthGuard extends StatelessWidget {
  final Widget child;
  const _AuthGuard({required this.child});

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, auth, _) {
        if (auth.loading) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator(color: AppColors.secondary)),
          );
        }
        if (!auth.isLoggedIn) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            Navigator.pushReplacementNamed(context, '/login');
          });
          return const SizedBox.shrink();
        }
        return child;
      },
    );
  }
}
