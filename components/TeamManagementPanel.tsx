import React, { useState, useMemo, useEffect } from 'react';
import { Shop, Role, TeamMember, User } from '../types';
import { getUserByUsername, getAllUsers } from '../services/authService';
import * as supabaseShopService from '../services/supabaseShopService';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import { useLocalization } from '../hooks/useLocalization';
import { useToast } from '../contexts/ToastContext';

interface TeamManagementPanelProps {
    shop: Shop;
    onUpdateShop: (updater: (prevShop: Shop) => Shop) => void;
    currentUserRole: Role | null;
    showConfirmation: (config: { title: string, message: string, onConfirm: () => void, confirmText?: string, confirmButtonClass?: string }) => void;
}

const TeamManagementPanel: React.FC<TeamManagementPanelProps> = ({ shop, onUpdateShop, currentUserRole, showConfirmation }) => {
    const [inviteUsername, setInviteUsername] = useState('');
    const [inviteRole, setInviteRole] = useState<Role>(Role.SUPPORT_AGENT);
    const [error, setError] = useState('');
    const [isInviting, setIsInviting] = useState(false);
    const { t } = useLocalization();
    const { showToast } = useToast();

    const [allUsers, setAllUsers] = useState<User[]>([]);
    const userMap = useMemo(() => new Map(allUsers.map(u => [u.id, u.username])), [allUsers]);
    
    // RBAC: Only OWNER and ADMIN can access team management
    if (currentUserRole !== Role.OWNER && currentUserRole !== Role.ADMIN) {
        return (
            <div className="bg-[#1D3B59] p-6 rounded-lg shadow-lg h-full overflow-y-auto">
                <h2 className="text-xl font-bold mb-2 text-[#F6F9FC]">{t('teamManagement')}</h2>
                <p className="text-red-400 text-sm">{t('accessDenied')}</p>
                <p className="text-gray-400 text-xs mt-2">Only the shop owner and admin can manage team members.</p>
            </div>
        );
    }

    // Helper function to determine which roles current user can assign
    const getAssignableRoles = () => {
        if (currentUserRole === Role.OWNER) {
            // Owner can assign all roles except Owner (can't demote self)
            return [Role.ADMIN, Role.ORDER_MANAGER, Role.SUPPORT_AGENT];
        } else if (currentUserRole === Role.ADMIN) {
            // Admin can only assign non-admin roles
            return [Role.ORDER_MANAGER, Role.SUPPORT_AGENT];
        }
        return [];
    };

    const assignableRoles = getAssignableRoles();
    
    // Load all users on mount
    useEffect(() => {
        const loadUsers = async () => {
            const users = await getAllUsers();
            setAllUsers(users);
        };
        loadUsers();
    }, []);
    
    const teamMembersWithNames = shop.team.map(member => ({
        ...member,
        username: userMap.get(member.userId) || 'Unknown User'
    }));
    
    const mockUsersForInvite = useMemo(() => {
        const teamUserIds = new Set(shop.team.map(m => m.userId));
        return allUsers.filter(u => !teamUserIds.has(u.id) && u.username !== 'admin').map(u => u.username).join(', ');
    }, [allUsers, shop.team]);


    const handleInvite = async () => {
        setError('');
        if (!inviteUsername.trim()) {
            setError(t('enterUsernameError'));
            return;
        }
        
        setIsInviting(true);
        try {
            const userToInvite = await getUserByUsername(inviteUsername);
            if (!userToInvite) {
                setError(t('userNotFound'));
                setIsInviting(false);
                return;
            }

            // Add user to shop via Supabase with role validation
            const result = await supabaseShopService.addTeamMember(shop.id, userToInvite.id, inviteRole, currentUserRole);

            if (result.success) {
                // Optimistic update
                onUpdateShop(s => ({
                    ...s,
                    team: [...s.team, { userId: userToInvite.id, role: inviteRole }]
                }));
                showToast(t('userInvitedSuccess', { username: userToInvite.username }), 'success');
                setInviteUsername('');
                // Reset to first assignable role
                setInviteRole(assignableRoles[0] as Role);
                console.log('✅ Team member added to database');
            } else {
                setError(result.error || t('inviteFailed'));
            }
        } catch (error) {
            console.error('❌ Failed to invite user:', error);
            setError('Failed to invite user. Please try again.');
        } finally {
            setIsInviting(false);
        }
    };
    
    const handleRemove = async (userId: string) => {
        const username = userMap.get(userId) || 'this user';
        showConfirmation({
            title: t('remove'),
            message: t('areYouSureRemoveUser', { username }),
            confirmText: t('remove'),
            confirmButtonClass: 'bg-red-600 hover:bg-red-700',
            onConfirm: async () => {
                try {
                    const success = await supabaseShopService.removeTeamMember(shop.id, userId);
                    if (success) {
                        // Optimistic update
                        onUpdateShop(s => ({ ...s, team: s.team.filter(m => m.userId !== userId) }));
                        showToast(t('userRemovedSuccess', { username }), 'success');
                        console.log('✅ Team member removed from database');
                    } else {
                        showToast('Failed to remove user.', 'error');
                    }
                } catch (error) {
                    console.error('❌ Failed to remove user:', error);
                    showToast('Failed to remove user. Please try again.', 'error');
                }
            },
        });
    };
    
    const handleRoleChange = async (userId: string, newRole: Role) => {
        try {
            const result = await supabaseShopService.updateTeamMemberRole(shop.id, userId, newRole, currentUserRole);
            if (result.success) {
                // Optimistic update
                onUpdateShop(s => ({ ...s, team: s.team.map(m => m.userId === userId ? { ...m, role: newRole } : m) }));
                showToast(t('userRoleUpdated'), 'success');
                console.log('✅ Team member role updated in database');
            } else {
                showToast(result.error || 'Failed to update user role.', 'error');
            }
        } catch (error) {
            console.error('❌ Failed to update role:', error);
            showToast('Failed to update user role. Please try again.', 'error');
        }
    };

    return (
        <div className="bg-[#1D3B59] p-6 rounded-lg shadow-lg h-full overflow-y-auto">
            <h2 className="text-xl font-bold mb-2 text-[#F6F9FC]">{t('teamManagement')}</h2>
            <p className="text-sm text-gray-400 mb-6">{t('manageTeam')}</p>
            
            {/* Invite Section */}
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 mb-6">
                <h3 className="font-semibold text-white mb-3">{t('inviteNewMember')}</h3>
                <div className="flex flex-col md:flex-row gap-2">
                    <input
                        type="text"
                        placeholder={t('enterUsername')}
                        value={inviteUsername}
                        onChange={e => { setInviteUsername(e.target.value); setError(''); }}
                        className="flex-grow bg-[#2c4f73] border border-[#4a6b8c] rounded-lg p-2 text-sm text-white"
                        disabled={isInviting}
                    />
                    <select
                        value={inviteRole}
                        onChange={e => setInviteRole(e.target.value as Role)}
                        className="bg-[#2c4f73] border border-[#4a6b8c] rounded-lg p-2 text-sm"
                        disabled={isInviting}
                    >
                        {assignableRoles.includes(Role.ADMIN) && <option value={Role.ADMIN}>{t('admin')}</option>}
                        {assignableRoles.includes(Role.ORDER_MANAGER) && <option value={Role.ORDER_MANAGER}>{t('orderManager')}</option>}
                        {assignableRoles.includes(Role.SUPPORT_AGENT) && <option value={Role.SUPPORT_AGENT}>{t('supportAgent')}</option>}
                    </select>
                    <button onClick={handleInvite} className="flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold disabled:bg-gray-500 disabled:cursor-wait" disabled={isInviting}>
                        {isInviting 
                            ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            : <><PlusIcon className="w-4 h-4 mr-2"/> {t('invite')}</>
                        }
                    </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                    {t('testingInviteHint', { users: mockUsersForInvite })}
                </p>
                {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
            </div>

            {/* Members List */}
            <div className="space-y-3">
                {teamMembersWithNames.map(member => (
                    <div key={member.userId} className="bg-gray-700 p-3 rounded-lg flex items-center justify-between">
                        <div>
                            <p className="font-semibold text-white">{member.username}</p>
                            <p className="text-xs text-gray-400">{t(member.role.toLowerCase().replace(' ', ''))}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {member.role !== Role.OWNER ? (
                                <>
                                    <select
                                        value={member.role}
                                        onChange={e => handleRoleChange(member.userId, e.target.value as Role)}
                                        className="bg-[#2c4f73] border border-[#4a6b8c] rounded-md p-1.5 text-xs"
                                    >
                                        {assignableRoles.includes(Role.ADMIN) && <option value={Role.ADMIN}>{t('admin')}</option>}
                                        {assignableRoles.includes(Role.ORDER_MANAGER) && <option value={Role.ORDER_MANAGER}>{t('orderManager')}</option>}
                                        {assignableRoles.includes(Role.SUPPORT_AGENT) && <option value={Role.SUPPORT_AGENT}>{t('supportAgent')}</option>}
                                    </select>
                                    <button
                                        onClick={() => handleRemove(member.userId)}
                                        className="p-2 text-gray-400 hover:text-red-400"
                                    >
                                        <TrashIcon className="w-4 h-4"/>
                                    </button>
                                </>
                            ) : (
                                <span className="text-xs bg-yellow-500 text-yellow-900 font-bold px-2 py-1 rounded-full">{t('owner')}</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TeamManagementPanel;