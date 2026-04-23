import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../services/api_service.dart';
import '../utils/constants.dart';

class ChatPage extends StatefulWidget {
  final String partnerId;
  final String partnerName;
  final String partnerRole;

  const ChatPage({
    super.key,
    required this.partnerId,
    required this.partnerName,
    required this.partnerRole,
  });

  @override
  State<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends State<ChatPage> {
  List<Map<String, dynamic>> messages = [];
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  bool loading = true;
  String? myUserId;
  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    _loadUserId();
    _fetchMessages();
    _markRead();
    _pollTimer = Timer.periodic(const Duration(seconds: 3), (_) => _fetchMessages());
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadUserId() async {
    final prefs = await SharedPreferences.getInstance();
    final userData = prefs.getString('user');
    if (userData != null) {
      final user = json.decode(userData);
      setState(() => myUserId = user['_id'] ?? user['id']);
    }
  }

  Future<void> _fetchMessages() async {
    try {
      final data = await ApiService.get('/chat/${widget.partnerId}');
      if (mounted) {
        setState(() {
          messages = List<Map<String, dynamic>>.from(data ?? []);
          loading = false;
        });
        _scrollToBottom();
      }
    } catch (_) {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> _markRead() async {
    try {
      await ApiService.post('/chat/mark-read', {'senderId': widget.partnerId});
    } catch (_) {}
  }

  Future<void> _sendMessage() async {
    final text = _controller.text.trim();
    if (text.isEmpty) return;

    // Optimistic update
    setState(() {
      messages.add({
        '_id': DateTime.now().millisecondsSinceEpoch.toString(),
        'sender': myUserId,
        'receiver': widget.partnerId,
        'content': text,
        'timestamp': DateTime.now().toIso8601String(),
      });
    });
    _controller.clear();
    _scrollToBottom();

    try {
      await ApiService.post('/chat/send', {
        'receiverId': widget.partnerId,
        'content': text,
      });
      _fetchMessages();
    } catch (_) {}
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: AppColors.secondaryContainer,
              child: Text(
                widget.partnerName.isNotEmpty ? widget.partnerName[0] : '?',
                style: GoogleFonts.manrope(fontWeight: FontWeight.w700, color: AppColors.secondary),
              ),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(widget.partnerName, style: GoogleFonts.manrope(fontSize: 16, fontWeight: FontWeight.w700)),
                Text(
                  widget.partnerRole == 'doctor' ? 'Doctor' : 'Patient',
                  style: GoogleFonts.inter(fontSize: 11, color: AppColors.outline),
                ),
              ],
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: loading
                ? const Center(child: CircularProgressIndicator(color: AppColors.secondary))
                : messages.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.chat_bubble_outline, size: 64, color: AppColors.outline),
                            const SizedBox(height: 12),
                            Text('Start a conversation', style: GoogleFonts.manrope(fontSize: 16, color: AppColors.outline)),
                            Text('with ${widget.partnerName}', style: GoogleFonts.inter(fontSize: 13, color: AppColors.outline)),
                          ],
                        ),
                      )
                    : ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        itemCount: messages.length,
                        itemBuilder: (_, i) => _buildBubble(messages[i]),
                      ),
          ),
          // Input bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.card,
              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 10, offset: const Offset(0, -2))],
            ),
            child: SafeArea(
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _sendMessage(),
                      decoration: InputDecoration(
                        hintText: 'Type a message...',
                        filled: true,
                        fillColor: AppColors.surfaceContainerHigh,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide.none),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    decoration: const BoxDecoration(color: AppColors.secondary, shape: BoxShape.circle),
                    child: IconButton(
                      onPressed: _sendMessage,
                      icon: const Icon(Icons.send, color: Colors.white, size: 20),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBubble(Map<String, dynamic> msg) {
    final isMine = msg['sender'] == myUserId;
    final time = _formatTime(msg['timestamp']);

    return Align(
      alignment: isMine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 3),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
        decoration: BoxDecoration(
          color: isMine ? AppColors.secondary : AppColors.surfaceContainerHigh,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(isMine ? 16 : 4),
            bottomRight: Radius.circular(isMine ? 4 : 16),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              msg['content'] ?? '',
              style: GoogleFonts.inter(fontSize: 14, color: isMine ? Colors.white : AppColors.onSurface, height: 1.4),
            ),
            const SizedBox(height: 4),
            Text(time, style: GoogleFonts.inter(fontSize: 10, color: isMine ? Colors.white70 : AppColors.outline)),
          ],
        ),
      ),
    );
  }

  String _formatTime(dynamic ts) {
    if (ts == null) return '';
    try {
      final d = DateTime.parse(ts.toString()).toLocal();
      final h = d.hour > 12 ? d.hour - 12 : (d.hour == 0 ? 12 : d.hour);
      final ampm = d.hour >= 12 ? 'PM' : 'AM';
      return '${h.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')} $ampm';
    } catch (_) {
      return '';
    }
  }
}
