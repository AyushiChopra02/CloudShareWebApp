package com.cloudshare.controller;

import com.cloudshare.dto.SubscriptionResponse;
import com.cloudshare.dto.UpgradeRequest;
import com.cloudshare.service.SubscriptionService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/subscription")
@RequiredArgsConstructor
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    @GetMapping
    public ResponseEntity<SubscriptionResponse> getSubscription(HttpServletRequest request) {
        String userId = getUserId(request);
        return ResponseEntity.ok(subscriptionService.getSubscription(userId));
    }

    @PutMapping("/upgrade")
    public ResponseEntity<SubscriptionResponse> upgrade(
            @RequestBody UpgradeRequest upgradeRequest,
            HttpServletRequest request
    ) {
        String userId = getUserId(request);
        return ResponseEntity.ok(subscriptionService.upgrade(userId, upgradeRequest));
    }

    private String getUserId(HttpServletRequest request) {
        String userId = (String) request.getAttribute("userId");
        if (userId == null || userId.isBlank()) {
            throw new RuntimeException("Unauthorized");
        }
        return userId;
    }
}
