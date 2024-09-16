import React, { useState, useEffect } from "react";
import { JsonRpcProvider, formatUnits, isAddress, parseUnits } from 'ethers'; // Importando isAddress diretamente
import "./style.css"; // Seu estilo existente

const BalanceChecker = () => {
  const [accounts, setAccounts] = useState([]); // Armazena todas as contas conectadas
  const [balances, setBalances] = useState({}); // Armazena os saldos de todas as contas
  const [sortedAccounts, setSortedAccounts] = useState([]); // Armazena contas ordenadas
  const [sortDirection, setSortDirection] = useState('desc'); // Direção de ordenação
  const [newAddress, setNewAddress] = useState(''); // Armazena o endereço manual
  const [copiedAddress, setCopiedAddress] = useState(''); // Armazena o endereço copiado
  const [searchTerm, setSearchTerm] = useState(''); // Termo de busca
  const [isConnected, setIsConnected] = useState(false);
  const [googleToken, setGoogleToken] = useState(null); // Armazena o token do Google OAuth
  const [error, setError] = useState(""); // Armazena as mensagens de erro
  const [duplicateAddressError, setDuplicateAddressError] = useState(false); // Controle do erro de duplicata

  const apiUrl = 'https://x8ki-letl-twmt.n7.xano.io/api:wHmUZQ0X/tabela'; // API do banco de dados
  const googleOAuthUrl = 'https://x8ki-letl-twmt.n7.xano.io/api:qNOtZhB0/oauth/google/init'; // URL para iniciar Google OAuth

  // Provedor de conexão à blockchain (via MetaMask ou fallback)
  let provider;

  if (typeof window.ethereum !== 'undefined') {
    provider = new JsonRpcProvider(window.ethereum); // Novo provider da versão 6.x
  } else {
    provider = new JsonRpcProvider(
      "https://flow-testnet.g.alchemy.com/v2/HHHDej4bNKMI7483-w_qt-IZQlUQK80w"
    );
  }

  // Função para iniciar o login com Google OAuth
  const startGoogleOAuth = () => {
    const redirectURI = "https://f62d7b52-63b0-4c7f-8550-81aeecca6656-00-7k5ozhdz4wp.worf.replit.dev:3000/";
    window.location.href = `${googleOAuthUrl}?redirect_uri=${redirectURI}`;
  };

  // Função para verificar o Google OAuth após redirecionamento
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code && !googleToken) {
      // Pega o token do Google OAuth após o redirecionamento
      fetch(`https://x8ki-letl-twmt.n7.xano.io/api:qNOtZhB0/oauth/google/continue?code=${code}`)
        .then((response) => response.json())
        .then((data) => {
          setGoogleToken(data.token);
        })
        .catch((err) => console.error("Erro ao autenticar via Google OAuth", err));
    }
  }, [googleToken]);

  // Função para conectar ao MetaMask e obter as contas conectadas
  const connectMetaMask = async () => {
    try {
      const accountsList = await window.ethereum.request({ method: "eth_requestAccounts" });
      if (accountsList.length > 0) {
        const normalizedAccounts = accountsList.map(account => account.toLowerCase()); // Normaliza as contas
        setAccounts((prevAccounts) => [...new Set([...prevAccounts, ...normalizedAccounts])]); // Evita duplicatas
        setIsConnected(true);
        setError("");

        // Checa e adiciona contas ao banco de dados
        for (const account of normalizedAccounts) {
          await checkAndAddAddress(account);
          getBalance(account); // Consultar saldo da conta conectada
        }
      }
    } catch (error) {
      console.error("Erro ao conectar MetaMask:", error);
      setError("Erro ao conectar MetaMask");
    }
  };

  // Função para verificar se o endereço já existe no BD e adicionar se necessário
  const checkAndAddAddress = async (address) => {
    try {
      const response = await fetch(apiUrl);
      const addresses = await response.json();

      // Normalizar todos os endereços do banco para minúsculas para comparação
      const addressExists = addresses.some((item) => item.address.toLowerCase() === address);

      if (!addressExists) {
        await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address })
        });
        console.log(`Endereço ${address} adicionado ao banco de dados.`);
      } else {
        // Exibe a mensagem de erro por 3 segundos
        setDuplicateAddressError(true);
        setTimeout(() => setDuplicateAddressError(false), 3000);
        console.log(`Endereço ${address} já existe no banco de dados.`);
      }
    } catch (error) {
      console.error("Erro ao verificar/adicionar endereço no banco de dados:", error);
    }
  };

  // Função para consultar o saldo de FLOW de uma conta
  const getBalance = async (account) => {
    try {
      const balance = await provider.getBalance(account);
      const flowBalance = formatUnits(balance, 18); // FLOW tem 18 decimais
      setBalances((prevBalances) => ({
        ...prevBalances,
        [account]: parseFloat(flowBalance).toFixed(2),
      }));
      setError("");
    } catch (error) {
      console.error("Erro ao consultar o saldo:", error);
      setError("Erro ao consultar o saldo");
    }
  };

  // Função para encurtar o endereço Ethereum
  const shortenAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Ordena as contas com base no saldo (da maior para a menor ou vice-versa)
  const sortAccounts = () => {
    const sorted = [...accounts].sort((a, b) => {
      const balanceA = parseFloat(balances[a]) || 0;
      const balanceB = parseFloat(balances[b]) || 0;

      return sortDirection === 'desc' ? balanceB - balanceA : balanceA - balanceB;
    });
    setSortedAccounts(sorted);
    setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc'); // Alterna a direção da ordenação
  };

  // Função para buscar endereços
  const filterAccounts = () => {
    if (searchTerm === '') {
      return sortedAccounts;
    }
    return sortedAccounts.filter(account => account.includes(searchTerm.toLowerCase()));
  };

  // Adiciona um novo endereço manualmente e consulta o saldo
  const addAddress = () => {
    const normalizedAddress = newAddress.toLowerCase(); // Normaliza para minúsculas
    if (isAddress(normalizedAddress)) { // Usando a função isAddress corretamente
      if (!accounts.includes(normalizedAddress)) {
        setAccounts((prevAccounts) => [...prevAccounts, normalizedAddress]);
        getBalance(normalizedAddress); // Consultar o saldo do novo endereço
        setNewAddress(''); // Limpar o campo de input
      } else {
        setDuplicateAddressError(true);
        setTimeout(() => setDuplicateAddressError(false), 3000);
      }
    } else {
      setError("Endereço inválido.");
    }
  };

  // Função para remover um endereço
  const removeAddress = (addressToRemove) => {
    setAccounts((prevAccounts) => prevAccounts.filter((account) => account !== addressToRemove));
    setSortedAccounts((prevSorted) => prevSorted.filter((account) => account !== addressToRemove));
    const updatedBalances = { ...balances };
    delete updatedBalances[addressToRemove]; // Remove o saldo associado
    setBalances(updatedBalances);
  };

  // Função para copiar o endereço para a área de transferência
  const copyAddressToClipboard = (address) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(''), 3000); // Remove a mensagem de "copiado" após 3 segundos
  };

  // Função para desconectar MetaMask e limpar o estado local
  const disconnectMetaMask = () => {
    setAccounts([]);  // Limpa as contas
    setBalances({});  // Limpa os saldos
    setSortedAccounts([]);  // Limpa as contas ordenadas
    setIsConnected(false);  // Define o estado como desconectado
    setError("");

    // Limpar as permissões da carteira MetaMask
    if (typeof window.ethereum !== "undefined") {
      window.ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      }).then(() => {
        console.log("Desconectado do MetaMask.");
      }).catch((error) => {
        console.error("Erro ao desconectar MetaMask:", error);
      });
    }
  };

  useEffect(() => {
    if (accounts.length > 0) {
      setSortedAccounts([...accounts]); // Inicializa as contas ordenadas
    }
  }, [accounts, balances]);

  return (
    <div className="container">
      <header>
        <h1>Ranking das Baleias 🐳</h1>
      </header>

      <section className="input-section">
        {!googleToken ? (
          <>
            <button onClick={startGoogleOAuth}>Login com Google</button>
          </>
        ) : !isConnected ? (
          <>
            <button onClick={connectMetaMask}>Ver Saldo</button>
          </>
        ) : (
          <>
            {duplicateAddressError && (
              <p className="error-message">Endereço já foi adicionado.</p>
            )}

            <div className="action-buttons">
              <button onClick={sortAccounts}>Ordenar</button>
              <button onClick={disconnectMetaMask}>Desconectar</button>
            </div>

            <div className="add-address">
              <input
                type="text"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="Adicionar endereço"
              />
              <button onClick={addAddress}>Adicionar</button>
            </div>

            <div className="search-bar">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por endereço"
              />
            </div>

            <table className="account-table">
              <thead>
                <tr>
                  <th>Conta</th>
                  <th>Saldo (FLOW)</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filterAccounts().map((account) => (
                  <tr key={account}>
                    <td>
                      <span>{shortenAddress(account)}</span>
                      <span onClick={() => copyAddressToClipboard(account)} className="copy-icon">
                        📋
                      </span>
                      {copiedAddress === account && <span className="copied-message">Copiado!</span>}
                    </td>
                    <td>{balances[account] ? balances[account] : "Carregando..."}</td>
                    <td>
                      <button onClick={() => removeAddress(account)} className="remove-button">Remover</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      <footer>
        <p>Powered by Flow Testnet and Alchemy</p>
      </footer>
    </div>
  );
};

export default BalanceChecker;
