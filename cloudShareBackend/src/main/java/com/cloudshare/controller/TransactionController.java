package com.cloudshare.controller;

import com.cloudshare.dto.TransactionRequest;
import com.cloudshare.entity.Transaction;
import com.cloudshare.service.TransactionService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    @GetMapping
    public ResponseEntity<List<Transaction>> getTransactions(HttpServletRequest request) {
        String userId = getUserId(request);
        return ResponseEntity.ok(transactionService.getUserTransactions(userId));
    }

    @PostMapping
    public ResponseEntity<Transaction> addTransaction(
            @RequestBody TransactionRequest transactionRequest,
            HttpServletRequest request
    ) {
        String userId = getUserId(request);
        return ResponseEntity.ok(transactionService.addTransaction(userId, transactionRequest));
    }

    private String getUserId(HttpServletRequest request) {
        String userId = (String) request.getAttribute("userId");
        if (userId == null || userId.isBlank()) {
            throw new RuntimeException("Unauthorized");
        }
        return userId;
    }
}
