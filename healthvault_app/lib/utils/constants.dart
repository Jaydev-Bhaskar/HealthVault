import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppColors {
  static const bg = Color(0xFFF4F1EA);
  static const surface = Color(0xFFFCF9F2);
  static const card = Color(0xFFFFFFFF);
  static const primary = Color(0xFF586400);
  static const primaryContainer = Color(0xFFD4ED31);
  static const primaryDim = Color(0xFFBAD205);
  static const secondary = Color(0xFF1B6968);
  static const secondaryContainer = Color(0xFFA8EFEE);
  static const onSurface = Color(0xFF1C1C18);
  static const onSurfaceVariant = Color(0xFF464834);
  static const outline = Color(0xFF777962);
  static const outlineVariant = Color(0xFFC7C9AE);
  static const surfaceContainer = Color(0xFFF1EEE7);
  static const surfaceContainerHigh = Color(0xFFEBE8E1);
  static const surfaceContainerLow = Color(0xFFF6F3EC);
  static const error = Color(0xFFBA1A1A);
  static const tertiary = Color(0xFF2A6578);
}

class AppTheme {
  static ThemeData get theme => ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: AppColors.bg,
        colorScheme: const ColorScheme.light(
          primary: AppColors.primary,
          primaryContainer: AppColors.primaryContainer,
          secondary: AppColors.secondary,
          secondaryContainer: AppColors.secondaryContainer,
          surface: AppColors.surface,
          error: AppColors.error,
          onSurface: AppColors.onSurface,
          outline: AppColors.outline,
        ),
        textTheme: GoogleFonts.interTextTheme().copyWith(
          headlineLarge: GoogleFonts.manrope(
            fontWeight: FontWeight.w800,
            letterSpacing: -0.5,
          ),
          headlineMedium: GoogleFonts.manrope(
            fontWeight: FontWeight.w800,
            letterSpacing: -0.5,
          ),
          headlineSmall: GoogleFonts.manrope(
            fontWeight: FontWeight.w700,
            letterSpacing: -0.3,
          ),
          titleLarge: GoogleFonts.manrope(
            fontWeight: FontWeight.w700,
          ),
          titleMedium: GoogleFonts.manrope(
            fontWeight: FontWeight.w600,
          ),
        ),
        cardTheme: CardThemeData(
          color: AppColors.card,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
          ),
          shadowColor: const Color(0x0F1C1C18),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primaryContainer,
            foregroundColor: AppColors.primary,
            padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            textStyle: GoogleFonts.manrope(
              fontWeight: FontWeight.w700,
              fontSize: 15,
            ),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: AppColors.surfaceContainerHigh,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(
              color: AppColors.primaryContainer,
              width: 2,
            ),
          ),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 18,
            vertical: 14,
          ),
          hintStyle: GoogleFonts.inter(
            color: AppColors.outline,
            fontSize: 14,
          ),
          labelStyle: GoogleFonts.inter(
            color: AppColors.onSurfaceVariant,
            fontSize: 12,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.5,
          ),
        ),
        appBarTheme: AppBarTheme(
          backgroundColor: Colors.transparent,
          elevation: 0,
          centerTitle: false,
          titleTextStyle: GoogleFonts.manrope(
            color: AppColors.onSurface,
            fontSize: 20,
            fontWeight: FontWeight.w800,
          ),
          iconTheme: const IconThemeData(color: AppColors.onSurface),
        ),
      );
}

const String baseUrl = 'https://healthvault-api-z32m.onrender.com/api';
