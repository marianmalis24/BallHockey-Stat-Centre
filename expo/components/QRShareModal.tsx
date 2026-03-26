import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Share,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { X, Copy, Share2, QrCode } from 'lucide-react-native';
import * as Linking from 'expo-linking';

interface QRShareModalProps {
  visible: boolean;
  shareCode: string;
  onClose: () => void;
}

export function QRShareModal({ visible, shareCode, onClose }: QRShareModalProps) {
  const shareUrl = useMemo(() => {
    return Linking.createURL('/live-scoreboard', { queryParams: { code: shareCode } });
  }, [shareCode]);

  const qrImageUrl = useMemo(() => {
    const encoded = encodeURIComponent(shareUrl);
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encoded}&bgcolor=0a0e1a&color=00aaff&format=png`;
  }, [shareUrl]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Watch our hockey game live!\n\nShare code: ${shareCode}\n\n${shareUrl}`,
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const handleCopyCode = useCallback(() => {
    Alert.alert('Share Code', shareCode, [{ text: 'OK' }]);
  }, [shareCode]);

  if (!shareCode) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X color="#8e8e93" size={22} />
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            <QrCode color="#0af" size={28} />
          </View>

          <Text style={styles.title}>Live Scoreboard</Text>
          <Text style={styles.subtitle}>
            Scan this QR code to watch the scoreboard live
          </Text>

          <View style={styles.qrContainer}>
            <Image
              source={{ uri: qrImageUrl }}
              style={styles.qrImage}
              contentFit="contain"
            />
          </View>

          <View style={styles.codeRow}>
            <Text style={styles.codeLabel}>Share Code</Text>
            <TouchableOpacity style={styles.codeBadge} onPress={handleCopyCode} activeOpacity={0.7}>
              <Text style={styles.codeText}>{shareCode}</Text>
              <Copy color="#0af" size={14} />
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>
            Viewers can also enter the code manually in the app
          </Text>

          <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
            <Share2 color="#fff" size={18} />
            <Text style={styles.shareBtnText}>Share Link</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modal: {
    backgroundColor: '#0f1322',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1a1e32',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(0,170,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#e8eaed',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#636366',
    textAlign: 'center' as const,
    marginBottom: 20,
    lineHeight: 20,
  },
  qrContainer: {
    width: 220,
    height: 220,
    borderRadius: 20,
    backgroundColor: '#0a0e1a',
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,170,255,0.2)',
  },
  qrImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  codeLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#636366',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  codeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,170,255,0.1)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,170,255,0.2)',
  },
  codeText: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#0af',
    letterSpacing: 3,
  },
  hint: {
    fontSize: 12,
    color: '#4a4a4e',
    textAlign: 'center' as const,
    marginBottom: 20,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0a84ff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    width: '100%',
  },
  shareBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
});
