"""
Tests for CORS utility functions
"""
import os
import pytest
from shared.cors_utils import get_allowed_origins, validate_origin, get_cors_headers


class TestGetAllowedOrigins:
    """Test get_allowed_origins function"""
    
    def test_returns_empty_list_when_no_env_var(self, monkeypatch):
        """Test returns empty list when ALLOWED_ORIGINS not set"""
        monkeypatch.delenv('ALLOWED_ORIGINS', raising=False)
        assert get_allowed_origins() == []
    
    def test_returns_empty_list_when_env_var_empty(self, monkeypatch):
        """Test returns empty list when ALLOWED_ORIGINS is empty string"""
        monkeypatch.setenv('ALLOWED_ORIGINS', '')
        assert get_allowed_origins() == []
    
    def test_parses_single_origin(self, monkeypatch):
        """Test parses single origin correctly"""
        monkeypatch.setenv('ALLOWED_ORIGINS', 'https://example.com')
        assert get_allowed_origins() == ['https://example.com']
    
    def test_parses_multiple_origins(self, monkeypatch):
        """Test parses multiple comma-separated origins"""
        monkeypatch.setenv('ALLOWED_ORIGINS', 'https://example.com,http://localhost:5173')
        assert get_allowed_origins() == ['https://example.com', 'http://localhost:5173']
    
    def test_strips_whitespace(self, monkeypatch):
        """Test strips whitespace from origins"""
        monkeypatch.setenv('ALLOWED_ORIGINS', ' https://example.com , http://localhost:5173 ')
        assert get_allowed_origins() == ['https://example.com', 'http://localhost:5173']
    
    def test_filters_empty_strings(self, monkeypatch):
        """Test filters out empty strings from list"""
        monkeypatch.setenv('ALLOWED_ORIGINS', 'https://example.com,,http://localhost:5173')
        assert get_allowed_origins() == ['https://example.com', 'http://localhost:5173']


class TestValidateOrigin:
    """Test validate_origin function"""
    
    def test_returns_none_when_origin_is_none(self, monkeypatch):
        """Test returns None when origin is None"""
        monkeypatch.setenv('ALLOWED_ORIGINS', 'https://example.com')
        assert validate_origin(None) is None
    
    def test_returns_none_when_no_allowed_origins(self, monkeypatch):
        """Test returns None when no allowed origins configured"""
        monkeypatch.delenv('ALLOWED_ORIGINS', raising=False)
        assert validate_origin('https://example.com') is None
    
    def test_returns_origin_when_in_allowed_list(self, monkeypatch):
        """Test returns origin when it's in the allowed list"""
        monkeypatch.setenv('ALLOWED_ORIGINS', 'https://example.com,http://localhost:5173')
        assert validate_origin('https://example.com') == 'https://example.com'
        assert validate_origin('http://localhost:5173') == 'http://localhost:5173'
    
    def test_returns_none_when_not_in_allowed_list(self, monkeypatch):
        """Test returns None when origin is not in allowed list"""
        monkeypatch.setenv('ALLOWED_ORIGINS', 'https://example.com')
        assert validate_origin('https://evil.com') is None
    
    def test_exact_match_required(self, monkeypatch):
        """Test that exact match is required (no subdomain matching)"""
        monkeypatch.setenv('ALLOWED_ORIGINS', 'https://example.com')
        assert validate_origin('https://sub.example.com') is None


class TestGetCorsHeaders:
    """Test get_cors_headers function"""
    
    def test_returns_validated_origin_when_valid(self, monkeypatch):
        """Test returns validated origin in headers when origin is valid"""
        monkeypatch.setenv('ALLOWED_ORIGINS', 'https://example.com,http://localhost:5173')
        
        event = {
            'headers': {
                'origin': 'https://example.com'
            }
        }
        
        headers = get_cors_headers(event)
        
        assert headers['Access-Control-Allow-Origin'] == 'https://example.com'
        assert headers['Access-Control-Allow-Headers'] == 'Content-Type,Authorization'
        assert headers['Access-Control-Allow-Methods'] == 'GET,POST,PUT,DELETE,OPTIONS'
        assert headers['Access-Control-Allow-Credentials'] == 'true'
    
    def test_returns_first_allowed_origin_when_invalid(self, monkeypatch):
        """Test returns first allowed origin when request origin is invalid"""
        monkeypatch.setenv('ALLOWED_ORIGINS', 'https://example.com,http://localhost:5173')
        
        event = {
            'headers': {
                'origin': 'https://evil.com'
            }
        }
        
        headers = get_cors_headers(event)
        
        assert headers['Access-Control-Allow-Origin'] == 'https://example.com'
        assert headers['Access-Control-Allow-Credentials'] == 'false'
    
    def test_handles_missing_origin_header(self, monkeypatch):
        """Test handles missing origin header"""
        monkeypatch.setenv('ALLOWED_ORIGINS', 'https://example.com')
        
        event = {
            'headers': {}
        }
        
        headers = get_cors_headers(event)
        
        assert headers['Access-Control-Allow-Origin'] == 'https://example.com'
    
    def test_handles_missing_headers_dict(self, monkeypatch):
        """Test handles missing headers dictionary"""
        monkeypatch.setenv('ALLOWED_ORIGINS', 'https://example.com')
        
        event = {}
        
        headers = get_cors_headers(event)
        
        assert headers['Access-Control-Allow-Origin'] == 'https://example.com'
    
    def test_handles_capital_origin_header(self, monkeypatch):
        """Test handles Origin header with capital O"""
        monkeypatch.setenv('ALLOWED_ORIGINS', 'https://example.com')
        
        event = {
            'headers': {
                'Origin': 'https://example.com'
            }
        }
        
        headers = get_cors_headers(event)
        
        assert headers['Access-Control-Allow-Origin'] == 'https://example.com'
        assert headers['Access-Control-Allow-Credentials'] == 'true'
    
    def test_returns_wildcard_when_no_allowed_origins(self, monkeypatch):
        """Test returns wildcard when no allowed origins configured"""
        monkeypatch.delenv('ALLOWED_ORIGINS', raising=False)
        
        event = {
            'headers': {
                'origin': 'https://example.com'
            }
        }
        
        headers = get_cors_headers(event)
        
        assert headers['Access-Control-Allow-Origin'] == '*'
        assert headers['Access-Control-Allow-Credentials'] == 'false'
