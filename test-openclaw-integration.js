#!/usr/bin/env node
/**
 * OpenClaw Integration Test
 * 
 * Tests the BuildAAgent → OpenClaw integration to verify:
 * 1. OpenClaw gateway is reachable
 * 2. Sessions can be created  
 * 3. Messages can be sent
 * 4. Responses are received
 */

const fetch = require('node-fetch')

const BUILDAAGENT_URL = 'http://localhost:3000'
const OPENCLAW_URL = 'http://localhost:8080'

async function testOpenClawDirectly() {
  console.log('🔍 Testing OpenClaw gateway directly...')
  
  try {
    const response = await fetch(`${OPENCLAW_URL}/api/health`)
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ OpenClaw gateway is healthy')
      return true
    } else {
      console.log(`❌ OpenClaw gateway unhealthy: ${response.status}`)
      return false
    }
  } catch (error) {
    console.log(`❌ Cannot reach OpenClaw gateway: ${error.message}`)
    console.log('💡 Make sure OpenClaw is running: openclaw gateway start')
    return false
  }
}

async function testBuildAAgentHealth() {
  console.log('\n🔍 Testing BuildAAgent health...')
  
  try {
    const response = await fetch(`${BUILDAAGENT_URL}/api/health`)
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ BuildAAgent API is healthy')
      console.log(`   Gateway provider: ${data.details?.gateway?.provider || 'unknown'}`)
      return true
    } else {
      console.log(`❌ BuildAAgent API unhealthy: ${response.status}`)
      return false
    }
  } catch (error) {
    console.log(`❌ Cannot reach BuildAAgent API: ${error.message}`)
    console.log('💡 Make sure BuildAAgent is running: npm start')
    return false
  }
}

async function testChatIntegration() {
  console.log('\n🔍 Testing chat integration...')
  
  try {
    const response = await fetch(`${BUILDAAGENT_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Hello! This is a test message.',
        user_id: 'test-user',
        persona: 'personal-assistant'
      })
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Chat integration working')
      console.log(`   Response: "${data.response?.substring(0, 100)}..."`)
      console.log(`   Persona: ${data.persona}`)
      return true
    } else {
      const error = await response.text()
      console.log(`❌ Chat integration failed: ${response.status}`)
      console.log(`   Error: ${error}`)
      return false
    }
  } catch (error) {
    console.log(`❌ Chat integration error: ${error.message}`)
    return false
  }
}

async function testTokenBridge() {
  console.log('\n🔍 Testing token bridge...')
  
  try {
    const response = await fetch(`${BUILDAAGENT_URL}/api/tokens/status?user_id=test-user`)
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Token bridge is accessible')
      console.log(`   Services: ${Object.keys(data.services || {}).join(', ') || 'none'}`)
      return true
    } else {
      console.log(`❌ Token bridge failed: ${response.status}`)
      return false
    }
  } catch (error) {
    console.log(`❌ Token bridge error: ${error.message}`)
    return false
  }
}

async function main() {
  console.log('🧪 BuildAAgent → OpenClaw Integration Test')
  console.log('==========================================\n')

  let allPassed = true

  // Test OpenClaw directly
  allPassed = await testOpenClawDirectly() && allPassed

  // Test BuildAAgent health
  allPassed = await testBuildAAgentHealth() && allPassed

  // Test chat integration
  allPassed = await testChatIntegration() && allPassed

  // Test token bridge
  allPassed = await testTokenBridge() && allPassed

  console.log('\n==========================================')
  if (allPassed) {
    console.log('🎉 All tests passed! OpenClaw integration is working.')
  } else {
    console.log('❌ Some tests failed. Check the setup:')
    console.log('\n🔧 Setup checklist:')
    console.log('1. OpenClaw gateway running: openclaw gateway start')
    console.log('2. BuildAAgent configured for OpenClaw: AI_PROVIDER=openclaw')
    console.log('3. BuildAAgent running: npm start')
    console.log('4. Environment variables set (see .env.example)')
  }
  
  process.exit(allPassed ? 0 : 1)
}

if (require.main === module) {
  main()
}