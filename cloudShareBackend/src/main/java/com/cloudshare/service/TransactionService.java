package com.cloudshare.service;

import com.cloudshare.dto.TransactionRequest;
import com.cloudshare.entity.Transaction;
import com.cloudshare.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TransactionService {

  private final TransactionRepository transactionRepository;

  public List<Transaction> getUserTransactions(String userId) {
    return transactionRepository.findByUserIdOrderByDateDesc(userId);
  }

  public Transaction addTransaction(String userId, TransactionRequest request) {
    Transaction txn = Transaction.builder()
        .userId(userId)
        .type(request.getType())
        .amount(request.getAmount())
        .status(request.getStatus())
        .paymentId(request.getPaymentId())
        .build();
    return transactionRepository.save(txn);
  }
}
