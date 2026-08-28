# Assinador GG Digital - JOMTI 2026 (MVP)

MVP estático para preencher os dados do Termo de Responsabilidade do JOMTI 2026, desenhar a assinatura com dedo/mouse e gerar o PDF no próprio navegador.

## Princípios do MVP

- Usa o PDF original como modelo, sem recriar o documento.
- Não usa banco de dados.
- Não envia dados pessoais ou assinatura para servidor.
- Geração do PDF ocorre no navegador com pdf-lib.
- Funciona em celular e desktop.
- Link de retorno já aponta para o Google Forms do JOMTI.

## Publicar na Vercel

Este projeto é HTML/CSS/JS estático. Basta publicar a pasta como projeto estático. Não há build command.

## Arquivos principais

- `index.html`: interface e conteúdo do termo.
- `styles.css`: identidade do Assinador GG Digital e responsividade.
- `app.js`: máscaras, validação, assinatura e geração do PDF.
- `assets/JOMTI_2026_Termo_Responsabilidade.pdf`: PDF original usado como modelo.

## Observação sobre assinatura

A assinatura é uma assinatura manuscrita capturada na tela e incorporada como imagem ao PDF. Este MVP não utiliza certificado digital ICP-Brasil nem provedor de assinatura eletrônica com trilha de auditoria.
