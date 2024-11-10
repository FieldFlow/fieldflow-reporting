# FieldFlow - ESG KPI Reporting System

the deployed website [https://thirdweb-esg-kpi.vercel.app/](https://thirdweb-esg-kpi.vercel.app/)

the deployed contract [https://testnet.explorer.etherlink.com/address/0x33c06A3610D58df2D6c3A8F24063b9b4DEEdB283](https://testnet.explorer.etherlink.com/address/0x33c06A3610D58df2D6c3A8F24063b9b4DEEdB283)

## Overview
FieldFlow is a blockchain-powered web solution designed to assist companies in efficiently reporting their ESG (Environmental, Social, and Governance) KPIs. Utilizing blockchain technology, FieldFlow ensures the transparency, integrity, and reliability of corporate ESG disclosures.

FieldFlow is an ideal solution for organizations seeking to meet ESG reporting requirements and enhance their sustainability practices. It also provides investors with reliable ESG data, facilitating informed decisions regarding responsible investments.

In the future, FieldFlow aims to provide comprehensive ESG metrics through explainable AI, allowing deeper insights into corporate sustainability efforts.

## Features
- **Web3 Wallet Integration**: Connect and verify company identities securely using popular Web3 wallets (e.g., MetaMask, WalletConnect, Coinbase).
- **ESG Data Submission**: Submit a wide range of ESG KPIs, including GHG emissions, hazardous waste, energy consumption, and water usage. Our ESG metrics are based on the classification outlined in the ESG report guide issued by HKEX and referenced in the journal "Computers & Industrial Engineering" (96th percentile): [link](https://www.sciencedirect.com/science/article/pii/S0360835222004909).
- **Blockchain Storage**: Store submitted ESG data on the Tezos L2 (Etherlink) testnet blockchain, ensuring data transparency and immutability. The solution can be deployed on any EVM-compatible blockchain, enabling interoperability.
- **User-Friendly UI**: Easy-to-use forms to submit and track ESG data, accessible via intuitive categories.
- **Feedback Mechanism**: Built-in feedback tools via Vercel, where the MVP is deployed, to gather user and client feedback.

## Technology Stack
- **Next.js**: A React framework for building server-rendered web applications.
- **Thirdweb**: Integration with Thirdweb for seamless Web3 interactions.
- **Blockchain**: Smart contracts for decentralized storage and validation of ESG data.
- **ethers.js**: A library for interacting with the Ethereum blockchain.

## Installation
To run the frontend of the project locally, you'll need Node.js and npm/yarn installed.

1. Clone the repository:
   ```sh
   git clone https://github.com/ermolaev1337/thirdweb-esg-kpi
   ```

2. Navigate to the project directory:
   ```sh
   cd frontend
   ```

3. Install the dependencies:
   ```sh
   npm install
   # or
yarn
   ```

4. Update the `.env` file to store the `NEXT_PUBLIC_TEMPLATE_CLIENT_ID` environment variable, provided by the project team, or create your own if you plan to deploy your own smart contract.

5. Start the development server:
   ```sh
   npm run dev
   ```

6. Open your browser and navigate to `http://localhost:3000` to view the app.

For contract interaction details, refer to the README.

1. Navigate to the contract directory from the project directory:
   ```sh
   cd esg-kpi
   ```

For more detailed information, check out the tutorial: [https://youtu.be/qDqJZl32oN4](https://youtu.be/qDqJZl32oN4)

## Usage
1. **Connect Wallet**: Click on the **Connect Wallet** button at the top right corner of the page to connect your Web3 wallet.
2. **Submit ESG Data**: Enter the required information in the provided forms for each ESG category, such as GHG Emissions, Hazardous Waste, etc.
3. **Track Submissions**: Upon successful submission, track the submitted ESG data and navigate to the investor page.

## Blockchain Data Verification
To verify the data on the blockchain, a separate contract transaction is initiated and processed accordingly.

When using the `stringToUint256` function, which converts a string to `bytes32` and then casts it to `BigNumber`, let's break down the given value:

```
0xf860f66d000000000000000000000000cbf7e1043ca0aa9a5d9c7d67e53dfd5a7839f87268617a6172646f75735761737465413136000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000d903
```

- **Function selector**: `0xf860f66d` - This selector identifies the function being called, determined by its ABI.
- **Parameter 1** (address): `000000000000000000000000cbf7e1043ca0aa9a5d9c7d67e53dfd5a7839f872` - After removing leading zeros, it becomes `0xcbf7e1043ca0aa9a5d9c7d67e53dfd5a7839f872`.
- **Parameter 2** (string represented as `bytes32`): `68617a6172646f7573576173746541313600000000000000000000000000000000` - This 32-byte value can be recognized as a UTF-8 string, resulting in "hazardousWasteA16".
- **Parameter 3** (`uint256`): `000000000000000000000000000000000000000000000000000000000000d903` - This value in hexadecimal is `0xd903`, equivalent to `55555` in decimal.

In summary:
- **Parameter 1** - Address: `0xcbf7e1043ca0aa9a5d9c7d67e53dfd5a7839f872`
- **Parameter 2** - String: "hazardousWasteA16"
- **Parameter 3** - Uint256: `55555`

This function call passes the string "hazardousWasteA16", which was converted to `bytes32` using your new function and then cast to `BigNumber`.

## Folder Structure
- `frontend/pages/` - Next.js pages including:
    - **for-investors**
    - **for-companies**
    - **main page**
- `esg-kpi/contracts/` - Solidity Smart contract:

## License
This project is licensed under the MIT License.

## Contact
For further questions or information, please contact us via email at [egor@fieldflow.lu](mailto:egor@fieldflow.lu) or visit our website [https://fieldflow.lu](https://fieldflow.lu).

To obtain test tokens for submitting data as a company, visit: [https://faucet.etherlink.com/](https://faucet.etherlink.com/)

## Demo

1. Open the website [https://thirdweb-esg-kpi.vercel.app/](https://thirdweb-esg-kpi.vercel.app/)
2. Connect the Web3 Wallet - button on the right top corner on each page of the Website. Consider MetaMask, if you don't have any  https://chromewebstore.google.com/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn?hl=en
3. Obtain test tokens for submitting data as a company, visit: [https://faucet.etherlink.com/](https://faucet.etherlink.com/)
4. Report your ESG KPIs as a company https://thirdweb-esg-kpi.vercel.app/for-companies
5. Or search by the company wallet address as an investor https://thirdweb-esg-kpi.vercel.app/for-investors?company-address=0xcBf7E1043ca0Aa9a5D9C7d67E53dFd5a7839F872

## Roadmap
1. Implement UI for the ZKP functionality https://github.com/sogelife-homies/halo2-private-esg/blob/main/examples/soglife_kpi_std.rs
2. Implement registry of companies (to see their verified wallet addresses)
3. Implement a dashboard of assets of companies and their environmental impact
4. Improve the smart contract to be production-ready
5. Implement explainable AI for summarizing of the environmental impact
