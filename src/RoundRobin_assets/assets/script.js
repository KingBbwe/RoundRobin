import React, { useState, useEffect } from 'react';
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

// Note: Replace with your actual canister ID
const CANISTER_ID = 'YOUR_CANISTER_ID';

const ContractInterface = () => {
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [contractState, setContractState] = useState('Draft');
  const [metadata, setMetadata] = useState({});
  const [participants, setParticipants] = useState([]);

  // Form states
  const [initForm, setInitForm] = useState({
    content: '',
    title: '',
    description: '',
    required: 2,
  });
  const [internetId, setInternetId] = useState('');
  const [signature, setSignature] = useState('');

  // Initialize connection to the canister
  useEffect(() => {
    const initContract = async () => {
      try {
        const agent = new HttpAgent();
        await agent.fetchRootKey();
        
        const contractActor = await Actor.createActor(idlFactory, {
          agent,
          canisterId: CANISTER_ID,
        });
        
        setContract(contractActor);
        
        // Fetch initial state
        await refreshContractState();
      } catch (err) {
        setError('Failed to initialize contract connection');
        console.error(err);
      }
    };

    initContract();
  }, []);

  // Refresh contract state
  const refreshContractState = async () => {
    if (!contract) return;

    try {
      const [state, meta, parts] = await Promise.all([
        contract.getContractStateSimplified(),
        contract.getContractMetadata(),
        contract.getRandomizedParticipants(false)
      ]);

      setContractState(state);
      setMetadata(meta);
      setParticipants(parts);
    } catch (err) {
      setError('Failed to fetch contract state');
      console.error(err);
    }
  };

  // Initialize contract
  const handleInitialize = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await contract.initializeContract(
        initForm.content,
        initForm.title,
        initForm.description,
        Number(initForm.required)
      );

      if ('ok' in result) {
        setSuccess('Contract initialized successfully');
        await refreshContractState();
      } else {
        setError(result.err);
      }
    } catch (err) {
      setError('Failed to initialize contract');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Add participant
  const handleAddParticipant = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await contract.addParticipant(internetId);
      
      if ('ok' in result) {
        setSuccess('Participant added successfully');
        setInternetId('');
        await refreshContractState();
      } else {
        setError(result.err);
      }
    } catch (err) {
      setError('Failed to add participant');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Sign contract
  const handleSign = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Convert signature string to Blob
      const signatureBlob = new TextEncoder().encode(signature);
      const result = await contract.sign(signatureBlob);
      
      if ('ok' in result) {
        setSuccess('Contract signed successfully');
        setSignature('');
        await refreshContractState();
      } else {
        setError(result.err);
      }
    } catch (err) {
      setError('Failed to sign contract');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Status Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Contract Status */}
      <Card>
        <CardHeader>
          <CardTitle>Contract Status: {contractState}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p>Title: {metadata.title}</p>
            <p>Description: {metadata.description}</p>
            <p>Version: {metadata.version}</p>
          </div>
        </CardContent>
      </Card>

      {/* Initialize Contract Form */}
      {contractState === 'Draft' && (
        <Card>
          <CardHeader>
            <CardTitle>Initialize Contract</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInitialize} className="space-y-4">
              <Input
                placeholder="Contract Content"
                value={initForm.content}
                onChange={(e) => setInitForm({...initForm, content: e.target.value})}
                required
              />
              <Input
                placeholder="Title"
                value={initForm.title}
                onChange={(e) => setInitForm({...initForm, title: e.target.value})}
                required
              />
              <Input
                placeholder="Description"
                value={initForm.description}
                onChange={(e) => setInitForm({...initForm, description: e.target.value})}
                required
              />
              <Input
                type="number"
                placeholder="Required Participants"
                value={initForm.required}
                onChange={(e) => setInitForm({...initForm, required: e.target.value})}
                min="2"
                required
              />
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : 'Initialize Contract'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Add Participant Form */}
      {contractState === 'Active' && (
        <Card>
          <CardHeader>
            <CardTitle>Add Participant</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddParticipant} className="space-y-4">
              <Input
                placeholder="Internet Identity"
                value={internetId}
                onChange={(e) => setInternetId(e.target.value)}
                required
              />
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : 'Add Participant'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Sign Contract Form */}
      {contractState === 'Active' && (
        <Card>
          <CardHeader>
            <CardTitle>Sign Contract</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSign} className="space-y-4">
              <Input
                placeholder="Signature"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                required
              />
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : 'Sign Contract'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Participants List */}
      <Card>
        <CardHeader>
          <CardTitle>Participants</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {participants.map((participant, index) => (
              <div key={index} className="p-2 border rounded">
                {participant}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContractInterface;
