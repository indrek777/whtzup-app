import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native'
import { userService } from '../utils/userService'

interface PasswordResetModalProps {
  visible: boolean
  onClose: () => void
  onSuccess?: () => void
}

export const PasswordResetModal: React.FC<PasswordResetModalProps> = ({
  visible,
  onClose,
  onSuccess
}) => {
  const [step, setStep] = useState<'email' | 'code' | 'password'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetToken, setResetToken] = useState('')

  const handleRequestCode = async () => {
    if (!email.trim()) {
      Alert.alert('Viga', 'Palun sisesta email')
      return
    }

    setLoading(true)
    try {
      const result = await userService.requestPasswordResetCode(email.trim())
      
      // In development, show the code for testing
      if (result.debug?.code) {
        Alert.alert(
          'Kood saadetud',
          `Test kood: ${result.debug.code}\n\nTõelises rakenduses saadetakse see emailile.`,
          [{ text: 'OK', onPress: () => setStep('code') }]
        )
      } else {
        Alert.alert('Kood saadetud', 'Kontrolli oma emaili ja sisesta 6-kohaline kood.')
        setStep('code')
      }
    } catch (error) {
      Alert.alert('Viga', error instanceof Error ? error.message : 'Koodi saatmine ebaõnnestus')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async () => {
    if (!code.trim() || code.trim().length !== 6) {
      Alert.alert('Viga', 'Palun sisesta 6-kohaline kood')
      return
    }

    setLoading(true)
    try {
      const result = await userService.verifyPasswordResetCode(email.trim(), code.trim())
      
      if (result.data?.resetToken) {
        setResetToken(result.data.resetToken)
        setStep('password')
      } else {
        Alert.alert('Viga', 'Koodi verifitseerimine ebaõnnestus')
      }
    } catch (error) {
      Alert.alert('Viga', error instanceof Error ? error.message : 'Koodi verifitseerimine ebaõnnestus')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!newPassword.trim() || newPassword.trim().length < 6) {
      Alert.alert('Viga', 'Parool peab olema vähemalt 6 tähemärki')
      return
    }

    if (newPassword.trim() !== confirmPassword.trim()) {
      Alert.alert('Viga', 'Paroolid ei kattu')
      return
    }

    setLoading(true)
    try {
      await userService.resetPasswordWithCode(resetToken, newPassword.trim())
      
      Alert.alert(
        'Õnnestus',
        'Parool on edukalt muudetud!',
        [{ text: 'OK', onPress: () => {
          onSuccess?.()
          handleClose()
        }}]
      )
    } catch (error) {
      Alert.alert('Viga', error instanceof Error ? error.message : 'Parooli muutmine ebaõnnestus')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setStep('email')
    setEmail('')
    setCode('')
    setNewPassword('')
    setConfirmPassword('')
    setResetToken('')
    setLoading(false)
    onClose()
  }

  const renderEmailStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>Parooli taastamine</Text>
      <Text style={styles.description}>
        Sisesta oma email ja saadame sulle 6-kohalise koodi parooli taastamiseks.
      </Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleRequestCode}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Saada kood</Text>
        )}
      </TouchableOpacity>
    </View>
  )

  const renderCodeStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>Sisesta kood</Text>
      <Text style={styles.description}>
        Sisesta 6-kohaline kood, mis saadeti aadressile {email}
      </Text>
      
      <TextInput
        style={styles.input}
        placeholder="6-kohaline kood"
        value={code}
        onChangeText={setCode}
        keyboardType="numeric"
        maxLength={6}
        autoCorrect={false}
      />
      
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => setStep('email')}
        >
          <Text style={styles.secondaryButtonText}>Tagasi</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleVerifyCode}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Kinnita</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )

  const renderPasswordStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>Uus parool</Text>
      <Text style={styles.description}>
        Sisesta uus parool (vähemalt 6 tähemärki)
      </Text>
      
      <TextInput
        style={styles.input}
        placeholder="Uus parool"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Kinnita uus parool"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
      />
      
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => setStep('code')}
        >
          <Text style={styles.secondaryButtonText}>Tagasi</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleResetPassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Muuda parool</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          {step === 'email' && renderEmailStep()}
          {step === 'code' && renderCodeStep()}
          {step === 'password' && renderPasswordStep()}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center'
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666'
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333'
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
    lineHeight: 22
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#f9f9f9'
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10
  },
  buttonDisabled: {
    backgroundColor: '#ccc'
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
    flex: 1
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600'
  }
})

export default PasswordResetModal
